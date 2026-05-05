import logging
from fastapi import HTTPException, status

from app.ai.base_provider import BaseAIProvider
from app.config import settings

logger = logging.getLogger(__name__)


class AnthropicProvider(BaseAIProvider):
    """
    AI provider implementation using Anthropic's Claude.
    """

    def __init__(self):
        import anthropic
        self.client = anthropic.Anthropic(
            api_key=settings.anthropic_api_key
        )
        self.model = settings.ai_model
        logger.info(f"Anthropic provider initialized with model: {self.model}")

    async def complete(self, prompt: str, max_tokens: int = 1000) -> str:
        """
        Sends prompt to Claude and returns response text.
        """
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return response.content[0].text.strip()

        except Exception as e:
            error_str = str(e).lower()

            if "authentication" in error_str or "api_key" in error_str:
                logger.error("Anthropic API key is invalid or missing")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service configuration error"
                )
            elif "rate_limit" in error_str or "rate limit" in error_str:
                logger.error("Anthropic API rate limit reached")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service is busy. Please try again in a moment."
                )
            else:
                logger.error(f"Anthropic API error: {e}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service is temporarily unavailable."
                )