import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackStatusUpdate

logger = logging.getLogger(__name__)


async def create_feedback(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: FeedbackCreate
) -> Feedback:
    """
    Creates a new feedback record from a logged in user.
    Any role can submit feedback — patient, doctor, admin.
    """
    feedback = Feedback(
        user_id=user_id,
        type=data.type,
        page=data.page,
        description=data.description,
        rating=data.rating,
        consultation_id=data.consultation_id,
        status="new"
    )
    db.add(feedback)
    await db.flush()
    await db.refresh(feedback)

    logger.info(
        f"Feedback submitted by user {user_id}: "
        f"type='{data.type}'"
    )
    return feedback


async def get_all_feedback(
    db: AsyncSession,
    status_filter: str | None = None,
    type_filter: str | None = None
) -> list[dict]:
    """
    Returns all feedback for admin view.
    Enriched with user name and email.
    """
    query = select(Feedback).order_by(Feedback.created_at.desc())

    if status_filter:
        query = query.where(Feedback.status == status_filter)

    if type_filter:
        query = query.where(Feedback.type == type_filter)

    result = await db.execute(query)
    feedbacks = result.scalars().all()

    output = []
    for fb in feedbacks:
        user_name = None
        user_email = None

        if fb.user_id:
            user_result = await db.execute(
                select(User).where(User.id == fb.user_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                user_name = user.name
                user_email = user.email

        output.append({
            "id": fb.id,
            "user_id": fb.user_id,
            "user_name": user_name,
            "user_email": user_email,
            "type": fb.type,
            "page": fb.page,
            "description": fb.description,
            "rating": fb.rating,
            "consultation_id": fb.consultation_id,
            "status": fb.status,
            "admin_notes": fb.admin_notes,
            "created_at": fb.created_at,
            "updated_at": fb.updated_at
        })

    return output


async def update_feedback_status(
    db: AsyncSession,
    feedback_id: uuid.UUID,
    data: FeedbackStatusUpdate
) -> Feedback:
    """
    Admin updates feedback status and optionally adds notes.
    """
    result = await db.execute(
        select(Feedback).where(Feedback.id == feedback_id)
    )
    feedback = result.scalar_one_or_none()

    if feedback is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )

    feedback.status = data.status
    if data.admin_notes is not None:
        feedback.admin_notes = data.admin_notes

    await db.flush()
    await db.refresh(feedback)

    logger.info(
        f"Feedback {feedback_id} updated to status '{data.status}'"
    )
    return feedback