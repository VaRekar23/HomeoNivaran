import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.order import Order
from app.models.consultation import Consultation
from app.models.prescription import Prescription
from app.models.ailment import Ailment
from app.models.family_member import FamilyMember
from app.schemas.order import DispatchUpdateRequest
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)


async def get_patient_orders(
    db: AsyncSession,
    patient_id: uuid.UUID
) -> list[dict]:
    """
    Returns all orders for a patient, most recent first.
    Enriched with ailment and member names for display.
    """
    result = await db.execute(
        select(Order)
        .where(Order.patient_id == patient_id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()

    output = []
    for order in orders:
        # Fetch consultation to get ailment and member
        consult_result = await db.execute(
            select(Consultation).where(
                Consultation.id == order.consultation_id
            )
        )
        consultation = consult_result.scalar_one_or_none()

        ailment_name = "Unknown"
        member_name = "Unknown"
        doctor_notes = None

        if consultation:
            ailment_result = await db.execute(
                select(Ailment).where(
                    Ailment.id == consultation.ailment_id
                )
            )
            ailment = ailment_result.scalar_one_or_none()
            ailment_name = ailment.name if ailment else "Unknown"

            member_result = await db.execute(
                select(FamilyMember).where(
                    FamilyMember.id == consultation.member_id
                )
            )
            member = member_result.scalar_one_or_none()
            member_name = member.name if member else "Unknown"

        # Fetch doctor notes from prescription
        prescription_result = await db.execute(
            select(Prescription).where(
                Prescription.id == order.prescription_id
            )
        )
        prescription = prescription_result.scalar_one_or_none()
        if prescription:
            doctor_notes = prescription.doctor_notes

        output.append({
            "id": order.id,
            "consultation_id": order.consultation_id,
            "prescription_id": order.prescription_id,
            "patient_id": order.patient_id,
            "total_amount": float(order.total_amount),
            "payment_status": order.payment_status,
            "order_status": order.order_status,
            "courier_name": order.courier_name,
            "tracking_number": order.tracking_number,
            "dispatched_at": order.dispatched_at,
            "delivered_at": order.delivered_at,
            "created_at": order.created_at,
            "ailment_name": ailment_name,
            "member_name": member_name,
            "doctor_notes": doctor_notes
        })

    return output


async def get_order_by_id(
    db: AsyncSession,
    order_id: uuid.UUID,
    patient_id: uuid.UUID
) -> dict:
    """
    Returns a single order for a patient.
    Verifies ownership — patient can only see their own orders.
    """
    result = await db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.patient_id == patient_id
        )
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Fetch enrichment data
    consult_result = await db.execute(
        select(Consultation).where(
            Consultation.id == order.consultation_id
        )
    )
    consultation = consult_result.scalar_one_or_none()

    ailment_name = "Unknown"
    member_name = "Unknown"

    if consultation:
        ailment_result = await db.execute(
            select(Ailment).where(Ailment.id == consultation.ailment_id)
        )
        ailment = ailment_result.scalar_one_or_none()
        ailment_name = ailment.name if ailment else "Unknown"

        member_result = await db.execute(
            select(FamilyMember).where(
                FamilyMember.id == consultation.member_id
            )
        )
        member = member_result.scalar_one_or_none()
        member_name = member.name if member else "Unknown"

    prescription_result = await db.execute(
        select(Prescription).where(
            Prescription.id == order.prescription_id
        )
    )
    prescription = prescription_result.scalar_one_or_none()

    return {
        "id": order.id,
        "consultation_id": order.consultation_id,
        "prescription_id": order.prescription_id,
        "patient_id": order.patient_id,
        "total_amount": float(order.total_amount),
        "payment_status": order.payment_status,
        "order_status": order.order_status,
        "courier_name": order.courier_name,
        "tracking_number": order.tracking_number,
        "dispatched_at": order.dispatched_at,
        "delivered_at": order.delivered_at,
        "created_at": order.created_at,
        "ailment_name": ailment_name,
        "member_name": member_name,
        "doctor_notes": prescription.doctor_notes if prescription else None
    }


async def get_all_orders_doctor(
    db: AsyncSession,
    order_status: str | None = None
) -> list[dict]:
    """
    Returns all orders for the doctor view.
    Optionally filtered by order_status.
    """
    query = select(Order).order_by(Order.created_at.desc())

    if order_status:
        valid_statuses = [
            "awaiting_payment", "paid",
            "processing", "dispatched", "delivered"
        ]
        if order_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Valid values: {valid_statuses}"
            )
        query = query.where(Order.order_status == order_status)

    result = await db.execute(query)
    orders = result.scalars().all()

    output = []
    for order in orders:
        # Fetch patient name
        from app.models.user import User
        patient_result = await db.execute(
            select(User).where(User.id == order.patient_id)
        )
        patient = patient_result.scalar_one_or_none()

        # Fetch ailment name via consultation
        consult_result = await db.execute(
            select(Consultation).where(
                Consultation.id == order.consultation_id
            )
        )
        consultation = consult_result.scalar_one_or_none()
        ailment_name = "Unknown"

        if consultation:
            ailment_result = await db.execute(
                select(Ailment).where(Ailment.id == consultation.ailment_id)
            )
            ailment = ailment_result.scalar_one_or_none()
            ailment_name = ailment.name if ailment else "Unknown"

        output.append({
            "id": order.id,
            "consultation_id": order.consultation_id,
            "prescription_id": order.prescription_id,
            "patient_id": order.patient_id,
            "patient_name": patient.name if patient else "Unknown",
            "patient_phone": patient.phone if patient else "Unknown",
            "ailment_name": ailment_name,
            "total_amount": float(order.total_amount),
            "payment_status": order.payment_status,
            "order_status": order.order_status,
            "courier_name": order.courier_name,
            "tracking_number": order.tracking_number,
            "dispatched_at": order.dispatched_at,
            "delivered_at": order.delivered_at,
            "created_at": order.created_at
        })

    return output


async def dispatch_order(
    db: AsyncSession,
    order_id: uuid.UUID,
    data: DispatchUpdateRequest
) -> dict:
    """
    Doctor marks an order as dispatched with tracking info.
    Only allowed when order_status is 'paid' or 'processing'.
    """
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.order_status not in ("paid", "processing"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot dispatch order. Current status is "
                   f"'{order.order_status}'. "
                   f"Order must be 'paid' or 'processing' to dispatch."
        )

    # Update dispatch info
    order.courier_name = data.courier_name
    order.tracking_number = data.tracking_number
    order.order_status = "dispatched"
    order.dispatched_at = datetime.now(timezone.utc)

    await db.flush()

    # Notify patient
    await create_notification(
        db=db,
        user_id=order.patient_id,
        type="order_dispatched",
        title="Your order has been dispatched!",
        message=(
            f"Your medicine has been dispatched via {data.courier_name}. "
            f"Tracking number: {data.tracking_number}"
        ),
        reference_id=order.id,
        reference_type="order"
    )

    logger.info(
        f"Order {order_id} dispatched. "
        f"Courier: {data.courier_name}, "
        f"Tracking: {data.tracking_number}"
    )

    return {
        "id": order.id,
        "order_status": order.order_status,
        "courier_name": order.courier_name,
        "tracking_number": order.tracking_number,
        "dispatched_at": order.dispatched_at,
        "message": "Order marked as dispatched successfully"
    }