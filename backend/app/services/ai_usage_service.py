import uuid
import time
import logging
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from typing import Optional, AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text

from app.models.ai_usage_log import AIUsageLog

logger = logging.getLogger(__name__)

# ── Anthropic Claude pricing (per 1M tokens) ──
# Update these when Anthropic changes pricing
MODEL_PRICING = {
    "claude-sonnet-4-20250514": {
        "input":  3.00,   # $3.00 per 1M input tokens
        "output": 15.00,  # $15.00 per 1M output tokens
    },
    "claude-opus-4": {
        "input":  15.00,
        "output": 75.00,
    },
    "claude-haiku-4-5-20251001": {
        "input":  0.80,
        "output": 4.00,
    },
    "gpt-4o-mini": {
        "input":  0.15,
        "output": 0.60,
    },
    "default": {
        "input":  3.00,
        "output": 15.00,
    }
}


def calculate_cost(
    model: str,
    prompt_tokens: int,
    completion_tokens: int
) -> float:
    """Calculate cost in USD from token counts."""
    pricing = MODEL_PRICING.get(model, MODEL_PRICING["default"])
    input_cost  = (prompt_tokens / 1_000_000) * pricing["input"]
    output_cost = (completion_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


async def log_ai_usage(
    db: AsyncSession,
    feature: str,
    model: str,
    provider: str,
    prompt_tokens: int,
    completion_tokens: int,
    duration_ms: int,
    was_cached: bool = False,
    consultation_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
) -> None:
    """
    Records a single AI API call to the usage log.
    Called after every AI interaction.
    Never raises — logging must not break the main flow.
    """
    try:
        total_tokens = prompt_tokens + completion_tokens
        cost = calculate_cost(model, prompt_tokens, completion_tokens)

        log = AIUsageLog(
            feature=feature,
            model=model,
            provider=provider,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_usd=cost,
            was_cached=was_cached,
            duration_ms=duration_ms,
            consultation_id=consultation_id,
            user_id=user_id,
        )
        db.add(log)
        await db.flush()

        logger.debug(
            f"AI usage logged: {feature} | "
            f"{total_tokens} tokens | "
            f"${cost:.4f} | {duration_ms}ms"
        )
    except Exception as e:
        logger.warning(f"Failed to log AI usage: {e}")


async def get_ai_usage_stats(
    db: AsyncSession,
    days: int = 30
) -> dict:
    """
    Aggregated AI usage stats for the admin dashboard.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Overall totals
    totals = await db.execute(
        select(
            func.count(AIUsageLog.id).label("total_calls"),
            func.sum(AIUsageLog.total_tokens).label("total_tokens"),
            func.sum(AIUsageLog.prompt_tokens).label("total_prompt"),
            func.sum(AIUsageLog.completion_tokens).label("total_completion"),
            func.sum(AIUsageLog.cost_usd).label("total_cost"),
            func.avg(AIUsageLog.duration_ms).label("avg_duration"),
            func.count(AIUsageLog.id).filter(
                AIUsageLog.was_cached == True
            ).label("cached_calls"),
        ).where(AIUsageLog.created_at >= since)
    )
    row = totals.one()

    total_calls  = row.total_calls or 0
    cached_calls = row.cached_calls or 0
    cache_rate   = (
        round((cached_calls / total_calls) * 100)
        if total_calls > 0 else 0
    )

    # By feature
    by_feature_result = await db.execute(
        select(
            AIUsageLog.feature,
            func.count(AIUsageLog.id).label("calls"),
            func.sum(AIUsageLog.total_tokens).label("tokens"),
            func.sum(AIUsageLog.cost_usd).label("cost"),
            func.avg(AIUsageLog.duration_ms).label("avg_ms"),
        ).where(
            AIUsageLog.created_at >= since
        ).group_by(AIUsageLog.feature)
        .order_by(func.sum(AIUsageLog.cost_usd).desc())
    )
    by_feature = [
        {
            "feature": r.feature,
            "calls":   r.calls,
            "tokens":  int(r.tokens or 0),
            "cost":    round(float(r.cost or 0), 4),
            "avg_ms":  round(float(r.avg_ms or 0)),
        }
        for r in by_feature_result
    ]

    # Daily trend
    day_trunc = func.date_trunc("day", AIUsageLog.created_at)

    daily_result = await db.execute(
        select(
            day_trunc.label("day"),
            func.count(AIUsageLog.id).label("calls"),
            func.sum(AIUsageLog.total_tokens).label("tokens"),
            func.sum(AIUsageLog.cost_usd).label("cost"),
        )
        .where(AIUsageLog.created_at >= since)
        .group_by(day_trunc)
        .order_by(day_trunc.asc())
    )
    daily = [
        {
            "date":   row.day.strftime("%Y-%m-%d"),
            "calls":  row.calls,
            "tokens": int(row.tokens or 0),
            "cost":   round(float(row.cost or 0), 4),
        }
        for row in daily_result
    ]

    # All-time totals (for context)
    all_time = await db.execute(
        select(
            func.sum(AIUsageLog.total_tokens).label("tokens"),
            func.sum(AIUsageLog.cost_usd).label("cost"),
            func.count(AIUsageLog.id).label("calls"),
        )
    )
    at = all_time.one()

    return {
        "period_days":         days,
        "total_calls":         total_calls,
        "cached_calls":        cached_calls,
        "cache_hit_rate_pct":  cache_rate,
        "ai_calls":            total_calls - cached_calls,
        "total_tokens":        int(row.total_tokens or 0),
        "prompt_tokens":       int(row.total_prompt or 0),
        "completion_tokens":   int(row.total_completion or 0),
        "total_cost_usd":      round(float(row.total_cost or 0), 4),
        "avg_duration_ms":     round(float(row.avg_duration or 0)),
        "by_feature":          by_feature,
        "daily_trend":         daily,
        "all_time": {
            "calls":  int(at.calls or 0),
            "tokens": int(at.tokens or 0),
            "cost":   round(float(at.cost or 0), 4),
        }
    }