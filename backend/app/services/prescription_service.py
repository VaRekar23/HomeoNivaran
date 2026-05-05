import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.prescription import Prescription
from app.models.prescription_item import PrescriptionItem
from app.models.consultation import Consultation
from app.models.order import Order
from app.models.user import User
from app.schemas.prescription import PrescriptionCreate, PrescriptionUpdateRequest
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)


async def create_prescription(
    db: AsyncSession,
    doctor_id: uuid.UUID,
    data: PrescriptionCreate
) -> dict:
    """
    Creates a prescription for a consultation.
    Returns a plain dict to avoid SQLAlchemy lazy loading issues.
    """

    # Step 1 — Fetch and validate consultation
    consult_result = await db.execute(
        select(Consultation).where(
            Consultation.id == data.consultation_id
        )
    )
    consultation = consult_result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    if consultation.status != "under_review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create prescription. Consultation status is "
                   f"'{consultation.status}'. "
                   f"Must be 'under_review' to prescribe."
        )

    # Step 2 — Check no duplicate prescription
    existing_result = await db.execute(
        select(Prescription).where(
            Prescription.consultation_id == data.consultation_id
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A prescription already exists for this consultation. "
                   "Use the update endpoint to make changes."
        )

    # Step 3 — Create prescription
    prescription = Prescription(
        consultation_id=data.consultation_id,
        doctor_id=doctor_id,
        doctor_notes=data.doctor_notes,
        ai_suggestion=data.ai_suggestion,
        total_amount=data.total_amount,
        consultation_fee=data.consultation_fee,
        delivery_charges=data.delivery_charges
    )
    db.add(prescription)
    await db.flush()

    # Step 4 — Create prescription items and keep them in a plain list
    # We keep saved_items as a list of ORM objects in memory
    # We never access prescription.items (avoids lazy loading crash)
    saved_items = []
    medicines_total = 0.0

    for medicine_data in data.medicines:
        medicines_total += float(medicine_data.medicine_price or 0)
        item = PrescriptionItem(
            prescription_id=prescription.id,
            medicine_name=medicine_data.medicine_name,
            medicine_category=medicine_data.medicine_category,
            medicine_price=medicine_data.medicine_price or 0,
            potency=medicine_data.potency or None,
            dosage=medicine_data.dosage or None,
            frequency=medicine_data.frequency,
            duration=medicine_data.duration,
            instructions=medicine_data.instructions
        )
        db.add(item)
        saved_items.append(item)

    await db.flush()

    # Refresh items to get DB-generated values (created_at etc.)
    for item in saved_items:
        await db.refresh(item)

    # Step 5 — Auto-create order
    order = Order(
        consultation_id=data.consultation_id,
        prescription_id=prescription.id,
        patient_id=consultation.patient_id,
        total_amount=data.total_amount,
        payment_status="pending",
        order_status="awaiting_payment"
    )
    db.add(order)
    await db.flush()

    # Step 6 — Update consultation status
    consultation.status = "prescription_added"
    await db.flush()

    # Step 7 — Notify patient
    await create_notification(
        db=db,
        user_id=consultation.patient_id,
        type="prescription_ready",
        title="Your prescription is ready!",
        message=(
            f"Your prescription has been prepared by the doctor. "
            f"Please review it and complete the payment of "
            f"₹{data.total_amount:.2f} to proceed."
        ),
        reference_id=order.id,
        reference_type="order"
    )

    # Step 8 — Refresh prescription to get updated timestamps
    await db.refresh(prescription)

    logger.info(
        f"Prescription {prescription.id} created by doctor {doctor_id} "
        f"for consultation {data.consultation_id}. "
        f"Order {order.id} created. Amount: ₹{data.total_amount}"
    )

    return _build_prescription_dict(prescription, saved_items, is_paid = False)


async def get_prescription_by_id(
    db: AsyncSession,
    prescription_id: uuid.UUID
) -> dict:
    """Fetches a prescription by ID with all its items."""
    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id)
    )
    prescription = result.scalar_one_or_none()

    if prescription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )

    # Fetch items explicitly with await — never use prescription.items
    items_result = await db.execute(
        select(PrescriptionItem).where(
            PrescriptionItem.prescription_id == prescription_id
        )
    )
    items = items_result.scalars().all()

    return _build_prescription_dict(prescription, items, is_paid = False)


async def get_prescription_by_consultation(
    db: AsyncSession,
    consultation_id: uuid.UUID
) -> dict:
    """
    Fetches a prescription by consultation ID.
    Used by patient to view their prescription.
    """
    result = await db.execute(
        select(Prescription).where(
            Prescription.consultation_id == consultation_id
        )
    )
    prescription = result.scalar_one_or_none()

    if prescription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not yet available for this consultation"
        )
    
    # Check payment status via order
    order_result = await db.execute(
        select(Order).where(
            Order.consultation_id == consultation_id
        )
    )
    order = order_result.scalar_one_or_none()

    is_paid = order and order.payment_status == "success"

    # Fetch items explicitly — never use prescription.items
    items_result = await db.execute(
        select(PrescriptionItem).where(
            PrescriptionItem.prescription_id == prescription.id
        )
    )
    items = items_result.scalars().all()

    # Calculate medicines subtotal
    medicines_total = (
        float(prescription.total_amount)
        - float(prescription.consultation_fee)
        - float(prescription.delivery_charges)
    )

    return {
        **_build_prescription_dict(prescription, items, is_paid= is_paid),
        "order_status": order.order_status if order else None
        #"medicines_total": medicines_total,
    }


async def update_prescription(
    db: AsyncSession,
    prescription_id: uuid.UUID,
    doctor_id: uuid.UUID,
    data: PrescriptionUpdateRequest
) -> dict:
    """Updates a prescription — only before payment."""
    result = await db.execute(
        select(Prescription).where(
            Prescription.id == prescription_id
        )
    )
    prescription = result.scalar_one_or_none()

    if prescription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )

    if prescription.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own prescriptions"
        )

    # Check payment status
    order_result = await db.execute(
        select(Order).where(Order.prescription_id == prescription_id)
    )
    order = order_result.scalar_one_or_none()

    if order and order.payment_status == "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update prescription after payment."
        )

    update_data = data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update"
        )

    # Update scalar fields
    for field in ["doctor_notes", "total_amount",
                  "consultation_fee", "delivery_charges"]:
        if field in update_data:
            setattr(prescription, field, update_data[field])

    # Sync order amount
    if "total_amount" in update_data and order:
        order.total_amount = update_data["total_amount"]

    # Replace medicines if provided
    if "medicines" in update_data:
        existing = await db.execute(
            select(PrescriptionItem).where(
                PrescriptionItem.prescription_id == prescription_id
            )
        )
        for item in existing.scalars().all():
            await db.delete(item)
        await db.flush()

        new_items = []
        for med in data.medicines:
            item = PrescriptionItem(
                prescription_id=prescription_id,
                medicine_name=med.medicine_name,
                medicine_category=med.medicine_category,
                potency=med.potency,
                dosage=med.dosage,
                frequency=med.frequency,
                duration=med.duration,
                instructions=med.instructions
            )
            db.add(item)
            new_items.append(item)

        await db.flush()
        items = new_items
    else:
        items_result = await db.execute(
            select(PrescriptionItem).where(
                PrescriptionItem.prescription_id == prescription_id
            )
        )
        items = items_result.scalars().all()

    await db.flush()
    await db.refresh(prescription)

    return _build_prescription_dict(prescription, items, is_paid = False)


def _build_prescription_dict(prescription, items, is_paid: bool = False) -> dict:
    """Helper to build full prescription response dict."""
    return {
        "id": prescription.id,
        "consultation_id": prescription.consultation_id,
        "doctor_id": prescription.doctor_id,
        "doctor_notes": prescription.doctor_notes,
        "total_amount": float(prescription.total_amount),
        "consultation_fee": float(prescription.consultation_fee),
        "delivery_charges": float(prescription.delivery_charges),
        "created_at": prescription.created_at,
        "updated_at": prescription.updated_at,
        "is_paid": is_paid,
        "items": [
            {
                "id": item.id,
                "prescription_id": item.prescription_id,
                "medicine_name": item.medicine_name,
                "medicine_category": item.medicine_category,
                "medicine_price": float(item.medicine_price),
                "potency": item.potency,
                "dosage": item.dosage,
                "frequency": item.frequency,
                "duration": item.duration,
                "instructions": item.instructions,
                "created_at": item.created_at
            }
            for item in items
        ]
    }