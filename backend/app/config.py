from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "HomeopathyApp"
    environment: str = "development"
    debug: bool = False

    # Database
    database_url: str

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # Razorpay
    razorpay_key_id: str = ""
    razorpay_secret: str = ""

    # AI
    ai_provider: str = "openai"  # or "anthropic"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"  # or "claude-opus-4-20250514"

    # Email
    sendgrid_api_key: str = ""
    from_email: str = ""

    # SMS
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone: str = ""

    # Telegram
    telegram_bot_token: str = ""
    telegram_chat_id:   str = ""

    redis_url: str = ""
    # Production: redis://user:password@host:6379
    
    cache_ttl_questions: int = 60 * 60 * 24 * 7
    # 7 days in seconds
    
    cache_ttl_ailments: int = 60 * 60 * 10
    # 10 hours — ailment list changes rarely
    
    cache_enabled: bool = True
    # Set to False in dev to bypass cache during testing

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()