import logging
from app.ai.client import get_provider
from app.ai.prompts import PATIENT_SUMMARIZER_PROMPT

logger = logging.getLogger(__name__)


async def summarize_patient(
    ailment_name: str,
    age: int,
    gender: str,
    qa_pairs: list[dict]
) -> str:
    """
    Generates a concise clinical summary of the patient's case.
    Used by the doctor to quickly understand the patient's situation.

    Returns a summary string.
    On failure returns a fallback message — never crashes the doctor's flow.

    qa_pairs format:
    [
        { "question": "How long?", "answer": "3 days" },
        { "question": "Any fever?", "answer": "Yes" }
    ]
    """

    # Build the Q&A section of the prompt
    qa_text = ""
    for i, pair in enumerate(qa_pairs, start=1):
        question = pair.get("question", "Unknown question")
        answer = pair.get("answer", "No answer provided")
        qa_text += f"Q{i}: {question}\nA{i}: {answer}\n\n"

    prompt = PATIENT_SUMMARIZER_PROMPT.format(
        ailment=ailment_name,
        age=age,
        gender=gender,
        qa_pairs=qa_text
    )

    try:
        provider = get_provider()
        summary = await provider.complete(prompt, max_tokens=500)
        summary = summary.strip()

        logger.info(
            f"Generated patient summary for "
            f"ailment='{ailment_name}' age={age} gender={gender}"
        )
        return summary

    except Exception as e:
        # Graceful fallback — doctor can still work without AI summary
        # They can read the raw Q&A themselves
        logger.warning(
            f"AI summarizer failed, returning fallback message. Error: {e}"
        )
        return (
            "AI summary is temporarily unavailable. "
            "Please review the Q&A answers below directly."
        )