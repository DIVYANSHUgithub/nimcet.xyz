from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        env_ignore_empty=True,
    )

    app_name: str = "NIMCET.XYZ API"
    environment: str = "development"
    log_level: str = "INFO"

    supabase_url: str | None = None
    supabase_jwt_issuer: str | None = None
    supabase_jwks_url: str | None = None
    supabase_jwt_audience: str | None = None
    supabase_jwt_mode: Literal["jwks", "hs256"] | None = None
    supabase_jwt_algorithm: str | None = None
    supabase_jwt_secret: SecretStr | None = None

    database_url: SecretStr | None = None
    trusted_role_lookup_enabled: bool = False
    test_engine_enabled: bool = False
    cors_allowed_origins: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
