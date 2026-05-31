import uuid
import json
import logging
from app.ai.client import get_provider
from app.ai.prompts import MEDICINE_SUGGESTER_PROMPT
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "These are AI-generated suggestions only. "
    "The doctor must review and make the final prescription decision. "
    "Do not prescribe based solely on these suggestions."
)


async def suggest_medicines(
    db: AsyncSession,
    user_id: uuid.UUID,
    consultation_id: uuid.UUID,
    ailment_name: str,
    patient_summary: str
) -> list[dict]:
    """
    Suggests homeopathy medicines based on the patient summary.
    Used by the doctor as a reference — not a final prescription.

    Returns list of medicine suggestion dicts.
    On failure returns empty list — doctor can still prescribe manually.
    """
    prompt = MEDICINE_SUGGESTER_PROMPT.format(
        ailment=ailment_name,
        patient_summary=patient_summary
    )

    try:
        import time
        start = time.monotonic()
        provider = get_provider()
        raw_text, usage = await provider.complete_with_usage(prompt, max_tokens=1500)
        duration_ms = int((time.monotonic() - start) * 1000)

        raw_text = raw_text.strip()
        
        # Clean markdown fences if AI adds them
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1])

        suggestions = json.loads(raw_text)

        if not isinstance(suggestions, list):
            raise ValueError("AI response is not a list")

        # Validate and normalize each suggestion
        normalized = []
        for s in suggestions:
            if "medicine" not in s:
                continue
            normalized.append({
                "medicine":  s.get("medicine", ""),
                "potency":   s.get("potency", ""),
                "dosage":    s.get("dosage", ""),
                "frequency": s.get("frequency", ""),
                "reason":    s.get("reason", "")
            })

        logger.info(
            f"Generated {len(normalized)} medicine suggestions "
            f"for ailment='{ailment_name}'"
        )

        from app.services.ai_usage_service import log_ai_usage
        await log_ai_usage(
            db=db,
            feature="medicine_suggestion",
            model=usage.get("model", "unknown"),
            provider=usage.get("provider", "openai"),
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            duration_ms=duration_ms,
            was_cached=False,
            consultation_id=consultation_id,
            user_id=user_id,
        )

        return normalized

    except json.JSONDecodeError as e:
        logger.warning(f"Medicine suggester JSON parse failed: {e}")
        return []

    except Exception as e:
        # Graceful fallback — doctor prescribes manually
        logger.warning(f"Medicine suggester failed: {e}")
        return []