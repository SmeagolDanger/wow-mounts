"""Application configuration via environment variables."""

import os
import sys
import secrets
from functools import lru_cache


class Settings:
    # Environment
    APP_ENV: str = os.getenv("APP_ENV", "development")

    # Battle.net API
    BNET_CLIENT_ID: str = os.getenv("BNET_CLIENT_ID", "")
    BNET_CLIENT_SECRET: str = os.getenv("BNET_CLIENT_SECRET", "")
    BNET_REGION: str = os.getenv("BNET_REGION", "us")
    BNET_REDIRECT_URI: str = os.getenv("BNET_REDIRECT_URI", "http://localhost:8000/api/auth/bnet/callback")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://wowmounts:wowmounts@db:5432/wowmounts",
    )

    # App security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "").split(",")

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # Cache TTLs (seconds)
    MOUNT_INDEX_TTL: int = 86400  # 24h — mount list rarely changes
    CHARACTER_TTL: int = 3600     # 1h for character collections
    MOUNT_DETAIL_TTL: int = 604800  # 7 days for individual mount details

    def __init__(self):
        # In production, SECRET_KEY must be explicitly set and strong
        if self.is_production:
            if not self.SECRET_KEY or self.SECRET_KEY == "change-me-in-production":
                print("FATAL: SECRET_KEY must be set in production", file=sys.stderr)
                sys.exit(1)
            if len(self.SECRET_KEY) < 32:
                print("FATAL: SECRET_KEY must be at least 32 characters", file=sys.stderr)
                sys.exit(1)
            if not self.BNET_CLIENT_ID or not self.BNET_CLIENT_SECRET:
                print("WARNING: Battle.net credentials not set", file=sys.stderr)
            if self.CORS_ORIGINS == ["*"] or self.CORS_ORIGINS == [""]:
                print("FATAL: CORS_ORIGINS must be explicitly set in production (not *)", file=sys.stderr)
                sys.exit(1)
        else:
            # Dev defaults
            if not self.SECRET_KEY:
                self.SECRET_KEY = "dev-only-insecure-key-do-not-use-in-prod"
            if not self.CORS_ORIGINS or self.CORS_ORIGINS == [""]:
                self.CORS_ORIGINS = ["*"]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def bnet_api_base(self) -> str:
        return f"https://{self.BNET_REGION}.api.blizzard.com"

    @property
    def bnet_auth_base(self) -> str:
        return "https://oauth.battle.net"

    @property
    def bnet_authorize_url(self) -> str:
        return f"{self.bnet_auth_base}/authorize"

    @property
    def bnet_token_url(self) -> str:
        return f"{self.bnet_auth_base}/token"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
