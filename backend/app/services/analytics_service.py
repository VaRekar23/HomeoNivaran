from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from typing import Optional


async def get_consultation_analytics(
    db: AsyncSession,
    days: int = 30
) -> dict:
    from app.models.consultation import Consultation
    from app.models.ailment import Ailment

    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Total consultations in period
    total = await db.scalar(
        select(func.count(Consultation.id)).where(
            Consultation.submitted_at >= since
        )
    ) or 0

    # By status
    status_result = await db.execute(
        select(
            Consultation.status,
            func.count(Consultation.id).label("count")
        ).where(
            Consultation.submitted_at >= since
        ).group_by(Consultation.status)
    )
    by_status = {row.status: row.count for row in status_result}

    # By ailment category (top conditions)
    category_result = await db.execute(
        select(
            Ailment.category,
            func.count(Consultation.id).label("count")
        ).join(
            Ailment,
            Consultation.ailment_id == Ailment.id
        ).where(
            Consultation.submitted_at >= since
        ).group_by(Ailment.category)
        .order_by(func.count(Consultation.id).desc())
    )
    by_category = [
        {"category": row.category, "count": row.count}
        for row in category_result
    ]

    # Daily trend — last 30 days
    day_bucket = func.date_trunc("day", Consultation.submitted_at).label("day")

    daily_result = await db.execute(
        select(
            day_bucket,
            func.count(Consultation.id).label("count")
        ).where(
            Consultation.submitted_at >= since
        ).group_by(
            day_bucket
        ).order_by(
            day_bucket.asc()
        )
    )
    daily_trend = [
        {
            "date":  row.day.strftime("%Y-%m-%d"),
            "count": row.count
        }
        for row in daily_result
    ]

    # Offline vs online
    offline = await db.scalar(
        select(func.count(Consultation.id)).where(
            Consultation.submitted_at >= since,
            Consultation.is_offline == True
        )
    ) or 0

    return {
        "period_days":        days,
        "total":              total,
        "by_status":          by_status,
        "by_category":        by_category,
        "daily_trend":        daily_trend,
        "offline_count":      offline,
        "online_count":       total - offline,
    }


async def get_revenue_analytics(
    db: AsyncSession,
    days: int = 30
) -> dict:
    from app.models.order import Order
    from app.models.consultation import Consultation
    from app.models.ailment import Ailment

    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Total revenue
    total_revenue = await db.scalar(
        select(func.sum(Order.total_amount)).where(
            Order.payment_status == "success",
            Order.created_at >= since
        )
    ) or 0

    # Pending revenue (awaiting payment)
    pending_revenue = await db.scalar(
        select(func.sum(Order.total_amount)).where(
            Order.payment_status != "success",
            Order.created_at >= since
        )
    ) or 0

    # Order count by status
    order_status_result = await db.execute(
        select(
            Order.order_status,
            func.count(Order.id).label("count"),
            func.sum(Order.total_amount).label("total")
        ).where(
            Order.created_at >= since
        ).group_by(Order.order_status)
    )
    by_order_status = [
        {
            "status":  row.order_status,
            "count":   row.count,
            "total":   float(row.total or 0),
        }
        for row in order_status_result
    ]

    # Daily revenue trend
    day_bucket = func.date_trunc("day", Order.created_at)
    
    daily_result = await db.execute(
        select(
            day_bucket.label("day"),
            func.sum(Order.total_amount).label("revenue"),
            func.count(Order.id).label("orders")
        ).where(
            Order.payment_status == "success",
            Order.created_at >= since
        ).group_by(
            day_bucket
        ).order_by(
            day_bucket.asc()
        )
    )
    daily_revenue = [
        {
            "date":    row.day.strftime("%Y-%m-%d"),
            "revenue": float(row.revenue or 0),
            "orders":  row.orders,
        }
        for row in daily_result
    ]

    # Top ailments by revenue
    top_result = await db.execute(
        select(
            Ailment.name,
            Ailment.category,
            func.count(Order.id).label("orders"),
            func.sum(Order.total_amount).label("revenue")
        ).join(
            Consultation,
            Order.consultation_id == Consultation.id
        ).join(
            Ailment,
            Consultation.ailment_id == Ailment.id
        ).where(
            Order.payment_status == "success",
            Order.created_at >= since
        ).group_by(Ailment.name, Ailment.category)
        .order_by(func.sum(Order.total_amount).desc())
        .limit(5)
    )
    top_ailments = [
        {
            "ailment":  row.name,
            "category": row.category,
            "orders":   row.orders,
            "revenue":  float(row.revenue or 0),
        }
        for row in top_result
    ]

    return {
        "period_days":     days,
        "total_revenue":   float(total_revenue),
        "pending_revenue": float(pending_revenue),
        "by_order_status": by_order_status,
        "daily_revenue":   daily_revenue,
        "top_ailments":    top_ailments,
    }


async def get_patient_analytics(
    db: AsyncSession,
    days: int = 30
) -> dict:
    from app.models.user import User
    from app.models.consultation import Consultation

    since = datetime.now(timezone.utc) - timedelta(days=days)

    # New patients in period
    new_patients = await db.scalar(
        select(func.count(User.id)).where(
            User.role == "patient",
            User.created_at >= since
        )
    ) or 0

    # Total patients ever
    total_patients = await db.scalar(
        select(func.count(User.id)).where(
            User.role == "patient"
        )
    ) or 0

    # Returning patients (had consultation before this period)
    returning = await db.scalar(
        select(func.count(func.distinct(Consultation.patient_id))).where(
            Consultation.submitted_at >= since
        )
    ) or 0

    # Daily new patient registrations
    day_bucket = func.date_trunc("day", User.created_at)
    daily_result = await db.execute(
        select(
            day_bucket.label("day"),
            func.count(User.id).label("count")
        ).where(
            User.role == "patient",
            User.created_at >= since
        ).group_by(
            day_bucket
        ).order_by(
            day_bucket.asc()
        )
    )
    daily_signups = [
        {
            "date":  row.day.strftime("%Y-%m-%d"),
            "count": row.count
        }
        for row in daily_result
    ]

    return {
        "period_days":    days,
        "new_patients":   new_patients,
        "total_patients": total_patients,
        "active_this_period": returning,
        "daily_signups":  daily_signups,
    }