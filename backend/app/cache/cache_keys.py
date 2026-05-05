import uuid
from typing import Optional


def get_age_group(age: int) -> str:
    """
    Convert exact age to age group for cache key.
    Groups similar ages together — same questions apply.
    
    child  = 0-12
    teen   = 13-17
    adult  = 18-59
    senior = 60+
    """
    if age <= 12:
        return "child"
    elif age <= 17:
        return "teen"
    elif age <= 59:
        return "adult"
    else:
        return "senior"


def ai_questions_key(
    ailment_id: uuid.UUID,
    age: int,
    gender: str,
    known_allergies: Optional[str] = None
) -> str:
    """
    Cache key for AI-generated questions.
    
    Keyed by:
    - ailment_id: different conditions need different questions
    - age_group:  doctor asks different questions for children vs adults
    - gender:     some questions are gender-specific
    - has_allergies: slightly different questioning if allergies known
    
    NOT keyed by exact age — a 25yo and 30yo get same questions.
    NOT keyed by patient ID — questions are reused across patients.
    NOT keyed by known_allergies content — just whether they exist.
    """
    age_group = get_age_group(age)
    has_allergies = "yes" if known_allergies else "no"
    gender_normalized = gender.lower().strip()

    return (
        f"ai_questions:"
        f"{ailment_id}:"
        f"{age_group}:"
        f"{gender_normalized}:"
        f"{has_allergies}"
    )


def ailment_list_key() -> str:
    """Cache key for the full ailment list."""
    return "ailment_list:all"


def ailment_categories_key() -> str:
    """Cache key for ailment categories."""
    return "ailment_categories:all"


def public_stats_key() -> str:
    """Cache key for public landing page stats."""
    return "public_stats"