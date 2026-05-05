import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.payment import Payment
from app.models.order import Order
from app.models.consultation import Consultation
from app.models.user import User
from app.schemas.payment import PaymentVerifyRequest
from app.utils.razorpay_client import (
    create_razorpay_order,
    verify_payment_signature
)
from app.services.notification_service import create_notification
from app.config import settings

logger = logging.getLogger(__name__)


async def initiate_payment(
    db: AsyncSession,
    order_id: uuid.UUID,
    patient_id: uuid.UUID
) -> dict:
    """
    Creates a Razorpay payment order for the patient to pay.

    Steps:
    1. Fetch our order and verify ownership
    2. Check payment hasn't already been made
    3. Check no existing payment record (prevent duplicate Razorpay orders)
    4. Create Razorpay order
    5. Save payment record to DB
    6. Return Razorpay details for frontend to open payment popup
    """

    # Step 1 — Fetch order and verify it belongs to this patient
    order_result = await db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.patient_id == patient_id
        )
    )
    order = order_result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Step 2 — Check not already paid
    if order.payment_status == "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order has already been paid."
        )

    # Step 3 — Check no existing payment record
    # If patient hit "Pay" twice quickly, prevent duplicate Razorpay orders
    existing_payment = await db.execute(
        select(Payment).where(Payment.order_id == order_id)
    )
    existing = existing_payment.scalar_one_or_none()

    if existing and existing.status == "pending":
        # Return existing Razorpay order instead of creating a new one
        # This handles the case where patient refreshed the page
        logger.info(
            f"Returning existing pending payment for order {order_id}"
        )
        return {
            "razorpay_order_id": existing.razorpay_order_id,
            "amount": int(float(existing.amount) * 100),
            "currency": existing.currency,
            "razorpay_key_id": settings.razorpay_key_id
        }

    # Step 4 — Create Razorpay order
    # Amount must be in paise (multiply by 100)
    amount_in_paise = int(float(order.total_amount) * 100)

    try:
        razorpay_order = create_razorpay_order(
            amount_in_paise=amount_in_paise,
            currency="INR",
            receipt=str(order_id)
            # receipt is our order ID — helps match Razorpay records
        )
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is temporarily unavailable. "
                   "Please try again."
        )

    # Step 5 — Save payment record to DB
    payment = Payment(
        order_id=order_id,
        razorpay_order_id=razorpay_order["id"],
        amount=order.total_amount,
        currency="INR",
        status="pending"
    )
    db.add(payment)
    await db.flush()

    logger.info(
        f"Payment initiated for order {order_id}. "
        f"Razorpay order: {razorpay_order['id']}. "
        f"Amount: ₹{order.total_amount}"
    )

    # Step 6 — Return what frontend needs
    return {
        "razorpay_order_id": razorpay_order["id"],
        "amount": amount_in_paise,
        "currency": "INR",
        "razorpay_key_id": settings.razorpay_key_id
    }


async def verify_payment(
    db: AsyncSession,
    data: PaymentVerifyRequest,
    patient_id: uuid.UUID
) -> dict:
    """
    Verifies a Razorpay payment after the patient completes it.

    Steps:
    1. Find the payment record by razorpay_order_id
    2. Verify the signature is genuine
    3. Update payment record as successful
    4. Update order status to paid
    5. Close the consultation
    6. Notify doctor
    7. Notify patient
    """

    # Step 1 — Find payment record
    payment_result = await db.execute(
        select(Payment).where(
            Payment.razorpay_order_id == data.razorpay_order_id
        )
    )
    payment = payment_result.scalar_one_or_none()

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment record not found"
        )

    # Verify this payment belongs to this patient
    order_result = await db.execute(
        select(Order).where(Order.id == payment.order_id)
    )
    order = order_result.scalar_one_or_none()

    if not order or order.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to verify this payment"
        )

    # Check not already verified
    if payment.status == "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This payment has already been verified."
        )

    # Step 2 — Verify Razorpay signature
    is_valid = verify_payment_signature(
        razorpay_order_id=data.razorpay_order_id,
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_signature=data.razorpay_signature
    )

    if not is_valid:
        # Mark payment as failed
        payment.status = "failed"
        await db.flush()

        logger.warning(
            f"Invalid payment signature for razorpay_order "
            f"{data.razorpay_order_id}. Possible fraud attempt."
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed. "
                   "Invalid signature — please contact support."
        )

    # Step 3 — Update payment record
    payment.razorpay_payment_id = data.razorpay_payment_id
    payment.razorpay_signature = data.razorpay_signature
    payment.status = "success"
    payment.completed_at = datetime.now(timezone.utc)
    await db.flush()

    # Step 4 — Update order status
    order.payment_status = "success"
    order.order_status = "paid"
    await db.flush()

    # Step 5 — Close the consultation
    consult_result = await db.execute(
        select(Consultation).where(
            Consultation.id == order.consultation_id
        )
    )
    consultation = consult_result.scalar_one_or_none()

    if consultation:
        consultation.status = "closed"
        consultation.closed_at = datetime.now(timezone.utc)
        await db.flush()

    # Fetch patient name for notification message
    patient_result = await db.execute(
        select(User).where(User.id == patient_id)
    )
    patient = patient_result.scalar_one_or_none()
    patient_name = patient.name if patient else "Patient"

    # Fetch doctor ID from prescription
    from app.models.prescription import Prescription
    prescription_result = await db.execute(
        select(Prescription).where(
            Prescription.id == order.prescription_id
        )
    )
    prescription = prescription_result.scalar_one_or_none()

    # Step 6 — Notify doctor
    if prescription:
        await create_notification(
            db=db,
            user_id=prescription.doctor_id,
            type="payment_received",
            title="Payment received!",
            message=(
                f"Payment of ₹{float(order.total_amount):.2f} received "
                f"from {patient_name}. "
                f"Please proceed to dispatch the medicine."
            ),
            reference_id=order.id,
            reference_type="order"
        )

    # Step 7 — Notify patient
    await create_notification(
        db=db,
        user_id=patient_id,
        type="payment_success",
        title="Payment successful!",
        message=(
            f"Your payment of ₹{float(order.total_amount):.2f} "
            f"was successful. Your medicine will be dispatched soon."
        ),
        reference_id=order.id,
        reference_type="order"
    )

    logger.info(
        f"Payment verified for order {order.id}. "
        f"Razorpay payment: {data.razorpay_payment_id}. "
        f"Amount: ₹{order.total_amount}"
    )

    return {
        "id": payment.id,
        "order_id": payment.order_id,
        "razorpay_order_id": payment.razorpay_order_id,
        "razorpay_payment_id": payment.razorpay_payment_id,
        "amount": float(payment.amount),
        "currency": payment.currency,
        "status": payment.status,
        "initiated_at": payment.initiated_at,
        "completed_at": payment.completed_at
    }


async def get_payment_by_order(
    db: AsyncSession,
    order_id: uuid.UUID,
    patient_id: uuid.UUID
) -> dict:
    """
    Returns payment details for an order.
    Verifies the order belongs to this patient.
    """
    # Verify order ownership first
    order_result = await db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.patient_id == patient_id
        )
    )
    order = order_result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Fetch payment
    payment_result = await db.execute(
        select(Payment).where(Payment.order_id == order_id)
    )
    payment = payment_result.scalar_one_or_none()

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No payment initiated for this order yet"
        )

    return {
        "id": payment.id,
        "order_id": payment.order_id,
        "razorpay_order_id": payment.razorpay_order_id,
        "razorpay_payment_id": payment.razorpay_payment_id,
        "amount": float(payment.amount),
        "currency": payment.currency,
        "status": payment.status,
        "initiated_at": payment.initiated_at,
        "completed_at": payment.completed_at
    }