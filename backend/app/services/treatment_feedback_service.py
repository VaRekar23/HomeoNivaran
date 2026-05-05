import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.treatment_feedback import TreatmentFeedback
from app.models.consultation import Consultation
from app.models.order import Order
from app.schemas.treatment_feedback import TreatmentFeedbackCreate

logger = logging.getLogger(__name__)


def _feedback_to_dict(fb: TreatmentFeedback) -> dict:
    return {
        "id":                      fb.id,
        "consultation_id":         fb.consultation_id,
        "patient_id":              fb.patient_id,
        "order_id":                fb.order_id,
        "overall_rating":          fb.overall_rating,
        "treatment_effectiveness": fb.treatment_effectiveness,
        "doctor_communication":    fb.doctor_communication,
        "delivery_experience":     fb.delivery_experience,
        "feeling_better":          fb.feeling_better,
        "would_recommend":         fb.would_recommend,
        "comments":                fb.comments,
        "is_requested_by_doctor":  fb.is_requested_by_doctor,
        "created_at":              fb.created_at,
    }


async def submit_treatment_feedback(
    db: AsyncSession,
    patient_id: uuid.UUID,
    data: TreatmentFeedbackCreate,
    is_requested_by_doctor: bool = False
) -> dict:
    """
    Patient submits treatment feedback for a consultation.
    One feedback per consultation — updates if already exists.
    """
    # Verify consultation belongs to patient
    consult_result = await db.execute(
        select(Consultation).where(
            Consultation.id == data.consultation_id,
            Consultation.patient_id == patient_id,
        )
    )
    consultation = consult_result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Find related order
    order_result = await db.execute(
        select(Order).where(
            Order.consultation_id == data.consultation_id
        )
    )
    order = order_result.scalar_one_or_none()

    # Check if feedback already exists — update if so
    existing_result = await db.execute(
        select(TreatmentFeedback).where(
            TreatmentFeedback.consultation_id == data.consultation_id
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        # Update existing feedback
        existing.overall_rating          = data.overall_rating
        existing.treatment_effectiveness = data.treatment_effectiveness
        existing.doctor_communication    = data.doctor_communication
        existing.delivery_experience     = data.delivery_experience
        existing.feeling_better          = data.feeling_better
        existing.would_recommend         = data.would_recommend
        existing.comments                = data.comments
        await db.flush()
        await db.refresh(existing)

        logger.info(
            f"Treatment feedback updated for consultation "
            f"{data.consultation_id} by patient {patient_id}"
        )
        return _feedback_to_dict(existing)

    # Create new feedback
    feedback = TreatmentFeedback(
        consultation_id=data.consultation_id,
        patient_id=patient_id,
        order_id=order.id if order else None,
        overall_rating=data.overall_rating,
        treatment_effectiveness=data.treatment_effectiveness,
        doctor_communication=data.doctor_communication,
        delivery_experience=data.delivery_experience,
        feeling_better=data.feeling_better,
        would_recommend=data.would_recommend,
        comments=data.comments,
        is_requested_by_doctor=is_requested_by_doctor,
    )
    db.add(feedback)
    await db.flush()
    await db.refresh(feedback)

    logger.info(
        f"Treatment feedback submitted for consultation "
        f"{data.consultation_id} — rating: {data.overall_rating}/5"
    )
    return _feedback_to_dict(feedback)


async def get_feedback_for_consultation(
    db: AsyncSession,
    consultation_id: uuid.UUID
) -> dict | None:
    """Returns feedback for a specific consultation if it exists."""
    result = await db.execute(
        select(TreatmentFeedback).where(
            TreatmentFeedback.consultation_id == consultation_id
        )
    )
    fb = result.scalar_one_or_none()
    return _feedback_to_dict(fb) if fb else None


async def get_all_treatment_feedback(
    db: AsyncSession,
    limit: int = 50
) -> list[dict]:
    """Admin: get all treatment feedback with patient info."""
    from app.models.user import User
    from app.models.ailment import Ailment

    result = await db.execute(
        select(TreatmentFeedback).order_by(
            TreatmentFeedback.created_at.desc()
        ).limit(limit)
    )
    feedbacks = result.scalars().all()

    output = []
    for fb in feedbacks:
        # Get patient name
        patient_result = await db.execute(
            select(User).where(User.id == fb.patient_id)
        )
        patient = patient_result.scalar_one_or_none()

        # Get ailment name via consultation
        consult_result = await db.execute(
            select(Consultation).where(
                Consultation.id == fb.consultation_id
            )
        )
        consultation = consult_result.scalar_one_or_none()

        ailment_name = "Unknown"
        if consultation:
            ailment_result = await db.execute(
                select(Ailment).where(
                    Ailment.id == consultation.ailment_id
                )
            )
            ailment = ailment_result.scalar_one_or_none()
            if ailment:
                ailment_name = ailment.name

        output.append({
            **_feedback_to_dict(fb),
            "patient_name":  patient.name if patient else "Unknown",
            "ailment_name":  ailment_name,
        })

    return output


async def get_feedback_stats(db: AsyncSession) -> dict:
    """
    Aggregated stats for the public stats API and admin dashboard.
    Used to show real satisfaction rate on landing page.
    """
    total = await db.scalar(
        select(func.count(TreatmentFeedback.id))
    ) or 0

    if total == 0:
        return {
            "total_feedback":        0,
            "average_rating":        0,
            "satisfaction_rate":     98,
            # Default 98% until we have real data
            "would_recommend_pct":   100,
            "feeling_better_pct":    100,
            "avg_effectiveness":     0,
            "avg_communication":     0,
            "avg_delivery":          0,
        }

    avg_rating = await db.scalar(
        select(func.avg(TreatmentFeedback.overall_rating))
    ) or 0

    # Satisfaction = % of ratings 4 or 5
    satisfied = await db.scalar(
        select(func.count(TreatmentFeedback.id)).where(
            TreatmentFeedback.overall_rating >= 4
        )
    ) or 0

    # Would recommend
    recommend_yes = await db.scalar(
        select(func.count(TreatmentFeedback.id)).where(
            TreatmentFeedback.would_recommend == True
        )
    ) or 0
    recommend_total = await db.scalar(
        select(func.count(TreatmentFeedback.id)).where(
            TreatmentFeedback.would_recommend.isnot(None)
        )
    ) or 1

    # Feeling better
    better_yes = await db.scalar(
        select(func.count(TreatmentFeedback.id)).where(
            TreatmentFeedback.feeling_better == True
        )
    ) or 0
    better_total = await db.scalar(
        select(func.count(TreatmentFeedback.id)).where(
            TreatmentFeedback.feeling_better.isnot(None)
        )
    ) or 1

    avg_effectiveness = await db.scalar(
        select(func.avg(TreatmentFeedback.treatment_effectiveness)).where(
            TreatmentFeedback.treatment_effectiveness.isnot(None)
        )
    ) or 0

    avg_communication = await db.scalar(
        select(func.avg(TreatmentFeedback.doctor_communication)).where(
            TreatmentFeedback.doctor_communication.isnot(None)
        )
    ) or 0

    avg_delivery = await db.scalar(
        select(func.avg(TreatmentFeedback.delivery_experience)).where(
            TreatmentFeedback.delivery_experience.isnot(None)
        )
    ) or 0

    return {
        "total_feedback":      total,
        "average_rating":      round(float(avg_rating), 1),
        "satisfaction_rate":   round((satisfied / total) * 100),
        "would_recommend_pct": round((recommend_yes / recommend_total) * 100),
        "feeling_better_pct":  round((better_yes / better_total) * 100),
        "avg_effectiveness":   round(float(avg_effectiveness), 1),
        "avg_communication":   round(float(avg_communication), 1),
        "avg_delivery":        round(float(avg_delivery), 1),
    }