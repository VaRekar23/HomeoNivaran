from app.ai.factory import get_ai_provider
from app.ai.base_provider import BaseAIProvider


def get_provider() -> BaseAIProvider:
    """
    Returns the active AI provider.
    Lazily initialized on first call.
    """
    return get_ai_provider()


__all__ = ["get_provider"]