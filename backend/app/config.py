import json
import os

from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(default="sqlite:///./chat_app.db", alias="DATABASE_URL")
    secret_key: str = Field(default="fallback-secret-change-in-prod", alias="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=60 * 24 * 7, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    allowed_origins: Annotated[list[str], NoDecode] = Field(default=["*"], alias="ALLOWED_ORIGINS")
    resend_api_key: str | None = Field(default=None, alias="RESEND_API_KEY")
    email_from: str | None = Field(default=None, alias="EMAIL_FROM")
    email_reply_to: str | None = Field(default=None, alias="EMAIL_REPLY_TO")
    app_base_url: str = Field(default="http://localhost:5173", alias="APP_BASE_URL")
    verification_code_expire_minutes: int = Field(default=10, alias="VERIFICATION_CODE_EXPIRE_MINUTES")
    verification_code_resend_seconds: int = Field(default=60, alias="VERIFICATION_CODE_RESEND_SECONDS")

    model_config = SettingsConfigDict(env_file=".env", populate_by_name=True, extra="ignore")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value):
        if isinstance(value, list):
            return value
        if value in (None, ""):
            return ["*"]
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                return parsed
            return [item.strip() for item in value.split(",") if item.strip()]
        raise ValueError("Invalid ALLOWED_ORIGINS value")


settings = Settings()
