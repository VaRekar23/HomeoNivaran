from abc import ABC, abstractmethod


class BaseAIProvider(ABC):
    """
    Abstract base class for AI providers.

    Every AI provider (Anthropic, OpenAI, Gemini etc.)
    must implement this interface.

    This means question_generator.py, summarizer.py etc.
    never need to know WHICH provider they're using.
    They just call provider.complete(prompt) and get text back.
    """

    @abstractmethod
    async def complete(self, prompt: str, max_tokens: int = 1000) -> str:
        """
        Sends a prompt to the AI and returns the response text.

        Args:
            prompt: The full prompt string to send
            max_tokens: Maximum length of response

        Returns:
            The AI's response as a plain string

        Raises:
            HTTPException 503 if the AI service is unavailable
        """
        pass