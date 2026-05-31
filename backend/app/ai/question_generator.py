import json
import time
import logging
from fastapi import HTTPException, status
from app.ai.client import get_provider
from app.ai.prompts import QUESTION_GENERATOR_PROMPT

import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis_client import cache_get, cache_set
from app.cache.cache_keys import ai_questions_key
from app.config import settings
from app.services.ai_usage_service import log_ai_usage

logger = logging.getLogger(__name__)


async def generate_questions(
    ailment_name: str,
    age: int,
    gender: str,
    known_allergies: Optional[str] = None,
    n: int = 7
) -> tuple[list[dict], dict]:
    """
    Generates clinical questions using the configured AI provider.
    Works with any provider — Anthropic, OpenAI, or others.
    """
    prompt = QUESTION_GENERATOR_PROMPT.format(
        ailment=ailment_name,
        age=age,
        gender=gender,
        n=n
    )

    # Get provider lazily — created on first call
    provider = get_provider()
    
    start = time.monotonic()
    raw_text, usage = await provider.complete_with_usage(prompt, max_tokens=1500)
    duration_ms = int((time.monotonic() - start) * 1000)

    raw_text = raw_text.strip()

    # Clean markdown fences if AI adds them
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])

    try:
        questions = json.loads(raw_text)

        if not isinstance(questions, list):
            raise ValueError("AI response is not a list")

        normalized = []
        for i, q in enumerate(questions):
            if "question" not in q or "type" not in q:
                logger.warning(f"Skipping malformed question at index {i}: {q}")
                continue
            normalized.append({
                "question": q["question"],
                "type": q.get("type", "text"),
                "options": q.get("options", [])
            })

        if not normalized:
            raise ValueError("No valid questions parsed")

        logger.info(
            f"Generated {len(normalized)} questions for "
            f"ailment='{ailment_name}' age={age} gender={gender}"
        )

        usage_metadata = {
            "model":             usage.get("model", "unknown"),
            "provider":          usage.get("provider", "openai"),
            "prompt_tokens":     usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "duration_ms":       duration_ms,
        }

        return normalized, usage_metadata

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}\nRaw: {raw_text}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service returned an invalid response. Please try again."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Question generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is temporarily unavailable. Please try again."
        )


async def generate_questions_with_cache(
    db:               AsyncSession,
    patient_id:       uuid.UUID,
    consultation_id:  uuid.UUID,
    ailment_name:     str,
    ailment_id:       uuid.UUID,
    age:              int,
    gender:           str,
    known_allergies:  Optional[str],
    # Pass the AI client in — avoids circular imports
) -> list[dict]:
    """
    Generates AI questions for a consultation.
    Checks cache first — only calls AI if cache miss.
    
    Returns list of question dicts:
    [
      {
        "question_text": "...",
        "question_type": "text|yes_no|mcq|scale",
        "options": [...] or None,
        "order_index": 0
      },
      ...
    ]
    """
    # Build cache key
    cache_key = ai_questions_key(
        ailment_id=ailment_id,
        age=age,
        gender=gender,
        known_allergies=known_allergies,
    )

    # ── Try cache first ──
    cached = await cache_get(cache_key)
    if cached is not None:
        logger.info(
            f"Cache HIT for questions: ailment={ailment_name} "
            f"age={age} gender={gender}"
        )

        # Log usage if cached result is used
        await log_ai_usage(
            db=db,
            feature="question_generation",
            model="cached",
            provider="cache",
            prompt_tokens=0,
            completion_tokens=0,
            duration_ms=0,
            was_cached=True,
            consultation_id=consultation_id,
            user_id=patient_id,
        )

        return cached

    logger.info(
        f"Cache MISS for questions: ailment={ailment_name} "
        f"age={age} gender={gender} → calling AI"
    )

    # ── Cache miss — call AI ──
    questions, usage = await generate_questions(
        ailment_name=ailment_name,
        age=age,
        gender=gender,
        known_allergies=known_allergies,
    )
    
    await log_ai_usage(
            db=db,
            feature="question_generation",
            model=usage.get("model", "unknown"),
            provider=usage.get("provider", "openai"),
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            duration_ms=usage.get("duration_ms", 0),
            was_cached=False,
            consultation_id=consultation_id,
            user_id=patient_id,
        )

    # ── Store in cache ──
    if questions:
        stored = await cache_set(
            key=cache_key,
            value=questions,
            ttl_seconds=settings.cache_ttl_questions,
        )
        if stored:
            logger.info(
                f"Cached {len(questions)} questions for "
                f"{ailment_name} / {gender} / age {age} "
                f"— TTL: 7 days"
            )

    return questions