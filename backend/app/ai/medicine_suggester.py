import json
import logging
from app.ai.client import get_provider
from app.ai.prompts import MEDICINE_SUGGESTER_PROMPT

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "These are AI-generated suggestions only. "
    "The doctor must review and make the final prescription decision. "
    "Do not prescribe based solely on these suggestions."
)


async def suggest_medicines(
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
        provider = get_provider()
        raw_text = await provider.complete(prompt, max_tokens=1500)
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
        return normalized

    except json.JSONDecodeError as e:
        logger.warning(f"Medicine suggester JSON parse failed: {e}")
        return []

    except Exception as e:
        # Graceful fallback — doctor prescribes manually
        logger.warning(f"Medicine suggester failed: {e}")
        return []