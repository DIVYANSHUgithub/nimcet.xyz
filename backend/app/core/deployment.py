"""Production configuration checks that never print credentials."""
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

from app.core.config import Settings
from app.core.security import SupabaseTokenVerifier


def public_https_url(value: str, *, origin_only: bool = False) -> bool:
    try:
        url = urlparse(value)
        return bool(url.scheme == "https" and url.hostname and "." in url.hostname
                    and url.hostname not in {"localhost", "127.0.0.1", "0.0.0.0"}
                    and not url.hostname.endswith((".localhost", ".example.com"))
                    and url.hostname != "example.com" and not url.username and not url.password
                    and not url.query and not url.fragment
                    and (not origin_only or url.path in {"", "/"}))
    except ValueError:
        return False


def deployment_errors(settings: Settings) -> list[str]:
    errors = []
    if settings.environment != "production":
        errors.append("Set ENVIRONMENT=production.")
    if not SupabaseTokenVerifier(settings).configured:
        errors.append("Configure the Supabase JWT issuer, audience, mode and verification key settings.")
    if not public_https_url(settings.supabase_url or ""):
        errors.append("SUPABASE_URL must be the hosted HTTPS project URL.")
    if not settings.cors_origins or any(not public_https_url(origin, origin_only=True) or origin.endswith("/") for origin in settings.cors_origins):
        errors.append("CORS_ALLOWED_ORIGINS must contain exact public HTTPS frontend origins without trailing slashes.")
    if not settings.test_engine_enabled or not settings.trusted_role_lookup_enabled:
        errors.append("Enable TEST_ENGINE_ENABLED and TRUSTED_ROLE_LOOKUP_ENABLED for the student MVP.")
    if settings.phase5_enabled and not settings.question_authoring_enabled:
        errors.append("Enable QUESTION_AUTHORING_ENABLED with PHASE5_ENABLED for the PYQ release.")
    try:
        url = make_url(settings.database_url.get_secret_value() if settings.database_url else "")
        if url.drivername not in {"postgresql", "postgresql+psycopg"} or url.query.get("sslmode") != "verify-full":
            errors.append("DATABASE_URL must use PostgreSQL and sslmode=verify-full.")
        if url.username in {"postgres", "service_role"} or (url.username or "").startswith("postgres."):
            errors.append("Use the dedicated runtime database login, not the database owner.")
        cert = settings.database_ssl_root_cert or url.query.get("sslrootcert")
        if cert:
            path = Path(cert)
            if not path.is_absolute():
                path = Path(__file__).resolve().parents[2] / path
            if not path.is_file():
                errors.append("The database CA certificate does not exist on this host.")
        else:
            errors.append("Set DATABASE_SSL_ROOT_CERT to the Supabase CA certificate path.")
    except (ArgumentError, ValueError, TypeError):
        errors.append("Set a valid server-only DATABASE_URL.")
    return errors
