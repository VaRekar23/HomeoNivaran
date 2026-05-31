import logging
from fastapi import HTTPException, status

from app.ai.base_provider import BaseAIProvider
from app.config import settings

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseAIProvider):
    """
    AI provider implementation using OpenAI's GPT models.
    """

    def __init__(self):
        try:
            from openai import OpenAI
            # Do NOT pass proxies or extra httpx config here
            # OpenAI 1.x manages its own HTTP client internally
            self.client = OpenAI(
                api_key=settings.openai_api_key
            )
            self.model = settings.ai_model
            logger.info(f"OpenAI provider initialized with model: {self.model}")

        except ImportError:
            raise RuntimeError(
                "OpenAI package not installed. Run: pip install openai"
            )

    async def complete(self, prompt: str, max_tokens: int = 1000) -> str:
        """
        Sends prompt to GPT and returns response text.

        Note: OpenAI SDK is synchronous by default.
        We call it directly here — FastAPI handles this fine
        because the DB and heavy async work happens elsewhere.
        For high-traffic production apps you'd use AsyncOpenAI instead.
        """
        text, _ = await self.complete_with_usage(prompt, max_tokens)
        return text
        
            
    async def complete_with_usage(self, prompt: str, max_tokens: int = 1000) -> tuple[str, dict]:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful medical assistant."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            usage = {
                "model":             response.model,
                "provider":          "openai",
                "prompt_tokens":     response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }

            # Extract text from OpenAI response
            # Different structure from Anthropic:
            # Anthropic: response.content[0].text
            # OpenAI:    response.choices[0].message.content
            return response.choices[0].message.content.strip(), usage

        except Exception as e:
            # Catch specific OpenAI errors by string matching
            # since openai exception classes vary by version
            error_str = str(e).lower()

            if "authentication" in error_str or "api key" in error_str:
                logger.error("OpenAI API key is invalid or missing")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service configuration error"
                )
            elif "rate limit" in error_str:
                logger.error("OpenAI API rate limit reached")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service is busy. Please try again in a moment."
                )
            elif "model" in error_str and "not found" in error_str:
                logger.error(f"OpenAI model '{self.model}' not found")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"AI model '{self.model}' is not available."
                )
            else:
                logger.error(f"OpenAI API error: {e}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service is temporarily unavailable."
                )