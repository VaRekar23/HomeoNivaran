import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_doctor
from app.models.user import User
from app.schemas.doctor import (
    QueueItemResponse,
    CaseReviewResponse,
    UpdateStatusRequest,
    AISummaryResponse,
    AIMedicineSuggestionResponse
)
from app.services import doctor_service
from app.schemas.order import DispatchUpdateRequest
from app.services import order_service

from app.services.prescription_service import get_prescription_by_id
from app.services.prescription_service import update_prescription as update_prescription_service
from app.schemas.prescription import PrescriptionResponse
from sqlalchemy import select
from app.models.prescription import Prescription
from app.schemas.prescription import PrescriptionUpdateRequest
from app.models.order import Order

from app.services.walkin_service import (
    WalkInPatientCreate,
    OfflineConsultationCreate,
    create_walkin_patient,
    create_offline_consultation,
    search_patients,
)

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/doctor", tags=["Doctor"])


@router.get(
    "/consultations",
    response_model=list[QueueItemResponse],
    status_code=status.HTTP_200_OK,
    summary="Get doctor's consultation queue"
)
async def get_queue(
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        description="Filter by status: submitted, under_review, "
                    "prescription_added, closed"
    ),
    ailment_id: Optional[str] = Query(
        default=None,
        description="Filter by ailment UUID"
    ),
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all consultations in the doctor's queue.
    Most recently submitted first.

    Filter examples:
    - /api/doctor/consultations?status=submitted
    - /api/doctor/consultations?status=under_review
    - /api/doctor/consultations?ailment_id=uuid-here
    """
    return await doctor_service.get_consultation_queue(
        db, status_filter, ailment_id
    )


@router.get(
    "/consultations/{consultation_id}",
    response_model=CaseReviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get full case details for review"
)
async def get_case(
    consultation_id: uuid.UUID,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the full case detail for a specific consultation.
    Includes patient info, member info, ailment info and all Q&A.

    Automatically moves status from 'submitted' to 'under_review'
    the first time the doctor opens this case.
    """
    return await doctor_service.get_case_detail(db, consultation_id)


@router.put(
    "/consultations/{consultation_id}/status",
    status_code=status.HTTP_200_OK,
    summary="Update consultation status"
)
async def update_status(
    consultation_id: uuid.UUID,
    data: UpdateStatusRequest,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually updates the consultation status.
    Enforces valid transitions only.

    Valid transitions:
    submitted → under_review
    under_review → prescription_added
    prescription_added → closed
    """
    return await doctor_service.update_consultation_status(
        db, consultation_id, data
    )


@router.post(
    "/consultations/{consultation_id}/ai-summary",
    response_model=AISummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI patient summary (Doctor only)"
)
async def get_ai_summary(
    consultation_id: uuid.UUID,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates an AI summary of the patient case.
    Doctor uses this to quickly understand the patient's situation
    before deciding on a prescription.

    Fails gracefully — returns a message if AI is unavailable.
    """
    return await doctor_service.get_ai_summary(db, consultation_id)


@router.post(
    "/consultations/{consultation_id}/ai-medicines",
    response_model=AIMedicineSuggestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get AI medicine suggestions (Doctor only)"
)
async def get_ai_medicines(
    consultation_id: uuid.UUID,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates AI homeopathy medicine suggestions for this case.
    Doctor reviews these suggestions before making final prescription.

    Returns empty suggestions list if AI is unavailable —
    doctor can always prescribe manually.
    """
    return await doctor_service.get_ai_medicine_suggestions(
        db, consultation_id
    )


@router.get(
    "/orders",
    status_code=status.HTTP_200_OK,
    summary="Get all orders (Doctor only)"
)
async def get_all_orders(
    order_status: Optional[str] = Query(
        default=None,
        alias="status",
        description="Filter by: awaiting_payment, paid, "
                    "processing, dispatched, delivered"
    ),
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all orders across all patients.
    Doctor uses this to see what needs to be dispatched.
    """
    return await order_service.get_all_orders_doctor(db, order_status)


@router.put(
    "/orders/{order_id}/dispatch",
    status_code=status.HTTP_200_OK,
    summary="Mark order as dispatched (Doctor only)"
)
async def dispatch_order(
    order_id: uuid.UUID,
    data: DispatchUpdateRequest,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks an order as dispatched with courier and tracking info.
    Only allowed when order is in 'paid' or 'processing' status.
    Patient gets notified automatically.
    """
    return await order_service.dispatch_order(db, order_id, data)

@router.get(
    "/consultations/{consultation_id}/prescription",
    status_code=status.HTTP_200_OK,
    summary="Get full prescription for a consultation (Doctor only)"
)
async def get_prescription_for_case(
    consultation_id: uuid.UUID,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns full prescription for doctor.
    Never masked — doctor always sees medicine names.
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
            detail="Prescription not found"
        )

    from app.models.prescription_item import PrescriptionItem
    items_result = await db.execute(
        select(PrescriptionItem).where(
            PrescriptionItem.prescription_id == prescription.id
        )
    )
    items = items_result.scalars().all()

    order_result = await db.execute(
        select(Order).where(
            Order.consultation_id == consultation_id
        )
    )
    order = order_result.scalar_one_or_none()

    is_paid = order and order.payment_status == "success"

    from app.services.prescription_service import _build_prescription_dict
    return _build_prescription_dict(prescription, items, is_paid=is_paid)

@router.post(
    "/consultations/{consultation_id}/request-feedback",
    status_code=status.HTTP_200_OK,
    summary="Request feedback from patient (Doctor only)"
)
async def request_patient_feedback(
    consultation_id: uuid.UUID,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Sends a notification to the patient requesting feedback
    about their treatment experience.
    """
    from app.models.consultation import Consultation
    from app.services.notification_service import create_notification

    result = await db.execute(
        select(Consultation).where(
            Consultation.id == consultation_id
        )
    )
    consultation = result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    if consultation.status != "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only request feedback for closed consultations"
        )

    await create_notification(
        db=db,
        user_id=consultation.patient_id,
        type="feedback_requested",
        title="How was your treatment?",
        message=(
            "Your doctor would love to hear about your experience. "
            "Please share your feedback to help us improve."
        ),
        reference_id=consultation_id,
        reference_type="consultation"
    )

    return {"message": "Feedback request sent to patient successfully"}

@router.get(
    "/patients/search",
    status_code=status.HTTP_200_OK,
    summary="Search patients (Doctor only)"
)
async def search_patients_endpoint(
    q: str = Query(min_length=2, description="Search by name or phone"),
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await search_patients(db, q)


@router.post(
    "/patients/walkin",
    status_code=status.HTTP_201_CREATED,
    summary="Create walk-in patient (Doctor only)"
)
async def create_walkin(
    data: WalkInPatientCreate,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await create_walkin_patient(db, current_doctor.id, data)


@router.post(
    "/consultations/offline",
    status_code=status.HTTP_201_CREATED,
    summary="Create offline consultation on behalf of patient (Doctor only)"
)
async def create_offline(
    data: OfflineConsultationCreate,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await create_offline_consultation(db, current_doctor.id, data)


@router.put(
    "/prescriptions/{prescription_id}",
    status_code=status.HTTP_200_OK,
    summary="Update prescription before payment (Doctor only)"
)
async def update_prescription(
    prescription_id: uuid.UUID,
    data: PrescriptionUpdateRequest,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Doctor can edit prescription only before patient pays.
    After payment, prescription is locked.
    """
    return await update_prescription_service(
        db, prescription_id, current_doctor.id, data
    )


@router.get(
    "/prescriptions/{prescription_id}",
    status_code=status.HTTP_200_OK,
    summary="Get prescription by ID (Doctor only)"
)
async def get_prescription(
    prescription_id: uuid.UUID,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await get_prescription_by_id(db, prescription_id)


@router.put(
    "/orders/{order_id}/mark-paid",
    status_code=status.HTTP_200_OK,
    summary="Mark order as paid offline (Doctor only)"
)
async def mark_order_paid_offline(
    order_id: uuid.UUID,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Doctor marks payment as received offline (cash/UPI in person).
    Bypasses Razorpay — used for walk-in patients.
    """
    from app.models.order import Order
    from app.models.consultation import Consultation
    from app.models.prescription import Prescription
    from datetime import datetime, timezone

    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.payment_status == "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already marked as paid"
        )

    # Mark payment as received offline
    order.payment_status = "success"
    order.order_status = "processing"
    await db.flush()

    # Find consultation via order.consultation_id
    consult_result = await db.execute(
        select(Consultation).where(
            Consultation.id == order.consultation_id
        )
    )
    consultation = consult_result.scalar_one_or_none()

    if consultation:
        consultation.status = "closed"
        await db.flush()

    # So there's an audit trail even without Razorpay
    from app.models.payment import Payment
    offline_payment = Payment(
        order_id=order.id,
        razorpay_order_id=f"OFFLINE_{str(order.id)[:8].upper()}",
        razorpay_payment_id=f"OFFLINE_{str(order.id)[:8].upper()}",
        razorpay_signature="offline_payment_confirmed_by_doctor",
        amount=float(order.total_amount),
        currency="INR",
        status="success"
    )
    db.add(offline_payment)
    await db.flush()

    # Reveal full prescription to patient now
    # (payment confirmed — same effect as Razorpay payment)
    from app.services.notification_service import create_notification
    await create_notification(
        db=db,
        user_id=order.patient_id,
        type="payment_received",
        title="Offline payment confirmed",
        message=(
            "Your offline payment has been confirmed by the doctor. "
            "Your full prescription is now available."
        ),
        reference_id=order.id,
        reference_type="order"
    )

    logger.info(
        f"Doctor {current_doctor.id} marked order {order_id} "
        f"as paid offline"
    )

    return {
        "id":             order.id,
        "payment_status": order.payment_status,
        "order_status":   order.order_status,
        "consultation_id":     order.consultation_id,
        "consultation_status": consultation.status if consultation else None,
        "message":        "Order marked as paid. Patient notified."
    }


@router.get(
    "/patients/{patient_id}/history",
    status_code=status.HTTP_200_OK,
    summary="Get patient's past consultations (Doctor only)"
)
async def get_patient_history(
    patient_id: uuid.UUID,
    exclude: Optional[uuid.UUID] = Query(default=None),
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await doctor_service.get_patient_consultation_history(
        db, patient_id, exclude, limit=5
    )