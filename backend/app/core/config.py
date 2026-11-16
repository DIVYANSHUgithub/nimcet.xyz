from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
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
    database_ssl_root_cert: str | None = None
    database_pool_size: int = Field(default=3, ge=1, le=8)
    trusted_role_lookup_enabled: bool = False
    test_engine_enabled: bool = False
    question_authoring_enabled: bool = False
    phase5_enabled: bool = False
    admin_workflows_enabled: bool = False
    supabase_admin_key: SecretStr | None = None
    storage_bucket: str = "question-media"
    supabase_storage_key: SecretStr | None = None

    cors_allowed_origins: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    def database_options(self) -> dict:
        return {"ssl_root_cert": self.database_ssl_root_cert, "pool_size": self.database_pool_size}


@lru_cache
def get_settings() -> Settings:
    return Settings()
