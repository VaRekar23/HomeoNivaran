import logging
from app.ai.base_provider import BaseAIProvider

logger = logging.getLogger(__name__)

# Module-level variable — starts as None
# Populated on first use, not at import time
_ai_provider: BaseAIProvider | None = None


def get_ai_provider() -> BaseAIProvider:
    """
    Returns the correct AI provider based on AI_PROVIDER in .env

    Uses lazy initialization — provider created on first call,
    then reused for all subsequent calls.

    This means:
    - App starts even if AI config is wrong (fails on first AI call, not startup)
    - Easy to test (can set _ai_provider directly in tests)

    To switch providers — only change .env:
        AI_PROVIDER=anthropic  → uses Claude
        AI_PROVIDER=openai     → uses GPT
    """
    global _ai_provider

    # Return cached instance if already created
    if _ai_provider is not None:
        return _ai_provider

    from app.config import settings
    provider_name = settings.ai_provider.lower()

    logger.info(f"Initializing AI provider: {provider_name}")

    if provider_name == "anthropic":
        from app.ai.anthropic_provider import AnthropicProvider
        _ai_provider = AnthropicProvider()
        logger.info("Using Anthropic (Claude) as AI provider")

    elif provider_name == "openai":
        from app.ai.openai_provider import OpenAIProvider
        _ai_provider = OpenAIProvider()
        logger.info("Using OpenAI (GPT) as AI provider")

    else:
        raise ValueError(
            f"Unknown AI provider: '{provider_name}'. "
            f"Supported values: 'anthropic', 'openai'"
        )

    return _ai_provider


# Public function for getting the provider
# Other modules import this and call it like a function
# ai_provider = get_ai_provider() in client.py was the problem
# Now client.py calls get_ai_provider() lazily