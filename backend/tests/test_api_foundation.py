from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch
from uuid import UUID, uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends
from fastapi.testclient import TestClient
from pydantic import BaseModel, SecretStr

from app.api.dependencies import require_roles
from app.core.config import Settings
from app.core.security import SupabaseTokenVerifier
from app.db.database import Database
from app.main import create_app


ISSUER = "https://nimcet-test.supabase.co/auth/v1"
AUDIENCE = "authenticated"
HS256_SECRET = "unit-test-signing-secret-that-is-at-least-thirty-two-bytes"


def make_settings(**overrides) -> Settings:
    values = {
        "_env_file": None,
        "supabase_url": "https://nimcet-test.supabase.co",
        "supabase_jwt_issuer": ISSUER,
        "supabase_jwt_audience": AUDIENCE,
        "supabase_jwt_mode": "hs256",
        "supabase_jwt_algorithm": "HS256",
        "supabase_jwt_secret": SecretStr(HS256_SECRET),
        "database_url": SecretStr("sqlite+pysqlite:///:memory:"),
        "cors_allowed_origins": "http://localhost:5173",
        "log_level": "CRITICAL",
    }
    values.update(overrides)
    return Settings(**values)


def make_token(*, secret: Any = HS256_SECRET, algorithm: str = "HS256", **claim_overrides) -> str:
    now = datetime.now(UTC)
    claims = {
        "sub": str(uuid4()),
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "role": "authenticated",
        "app_metadata": {"roles": ["super_administrator"]},
    }
    claims.update(claim_overrides)
    return jwt.encode(claims, secret, algorithm=algorithm)


def make_client(settings: Settings | None = None) -> TestClient:
    app = create_app(settings=settings or make_settings())

    @app.get("/test/admin")
    async def admin_route(_principal=Depends(require_roles("administrator"))):
        return {"ok": True}

    class PasswordRequest(BaseModel):
        model_config = {"extra": "forbid"}
        password: str

    @app.post("/test/validate")
    async def validate_route(body: PasswordRequest):
        return {"ok": bool(body.password)}

    @app.get("/test/crash")
    async def crash_route():
        raise RuntimeError("connection password must not leak")

    return TestClient(app, raise_server_exceptions=False)


def test_health_and_readiness_with_configured_dependencies():
    with make_client() as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json() == {"status": "ok"}
        assert UUID(health.headers["x-request-id"])

        ready = client.get("/ready")
        assert ready.status_code == 200
        assert ready.json() == {"status": "ready"}


def test_health_stays_up_but_readiness_fails_without_database():
    settings = make_settings(database_url=None)
    with make_client(settings) as client:
        assert client.get("/health").status_code == 200
        response = client.get("/ready")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "not_ready"


def test_me_requires_bearer_token_and_uses_standard_error_envelope():
    with make_client() as client:
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401
        assert response.headers["www-authenticate"] == "Bearer"
        assert response.json()["error"]["code"] == "authentication_required"
        assert response.json()["error"]["request_id"]


def test_valid_supabase_token_returns_identity_without_elevating_from_metadata():
    token = make_token()
    with make_client() as client:
        response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["roles"] == ["student"]
        assert response.json()["user_id"]
        assert "super_administrator" not in response.text


def test_expired_wrong_issuer_wrong_audience_and_wrong_signature_are_rejected():
    expired = make_token(exp=datetime.now(UTC) - timedelta(minutes=1))
    wrong_issuer = make_token(iss="https://attacker.example/auth/v1")
    wrong_audience = make_token(aud="anon")
    wrong_signature = make_token(secret="different-unit-test-signing-secret-long-enough")

    with make_client() as client:
        for token in (expired, wrong_issuer, wrong_audience, wrong_signature):
            response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert response.status_code == 401
            assert response.json()["error"]["code"] == "invalid_access_token"


def test_unconfigured_auth_fails_closed():
    settings = make_settings(
        supabase_jwt_mode=None,
        supabase_jwt_algorithm=None,
        supabase_jwt_issuer=None,
        supabase_jwt_audience=None,
        supabase_jwt_secret=None,
    )
    with make_client(settings) as client:
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {make_token()}"},
        )
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "auth_not_configured"


def test_user_claims_cannot_satisfy_administrator_role_dependency():
    token = make_token(role="service_role", app_metadata={"roles": ["administrator"]})
    with make_client() as client:
        response = client.get("/test/admin", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "insufficient_role"


def test_cors_allows_only_configured_frontend_origin():
    with make_client() as client:
        allowed = client.options(
            "/api/v1/auth/me",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )
        assert allowed.status_code == 200
        assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
        assert "access-control-allow-credentials" not in allowed.headers

        denied = client.options(
            "/api/v1/auth/me",
            headers={
                "Origin": "https://attacker.example",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )
        assert denied.status_code == 400
        assert "access-control-allow-origin" not in denied.headers


def test_jwks_mode_verifies_with_configured_asymmetric_algorithm():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = make_token(secret=private_key, algorithm="RS256")
    settings = make_settings(
        supabase_jwt_mode="jwks",
        supabase_jwt_algorithm="RS256",
        supabase_jwks_url=f"{ISSUER}/.well-known/jwks.json",
    )
    fake_signing_key = SimpleNamespace(key=private_key.public_key())

    with patch("app.core.security.PyJWKClient") as client_class:
        client_class.return_value.get_signing_key_from_jwt.return_value = fake_signing_key
        identity = SupabaseTokenVerifier(settings).verify(token)

    assert identity.issuer == ISSUER
    assert identity.audience == AUDIENCE
    client_class.assert_called_once()


def test_jwks_url_must_match_the_configured_project_host():
    settings = make_settings(
        supabase_jwt_mode="jwks",
        supabase_jwt_algorithm="RS256",
        supabase_jwks_url="https://attacker.example/.well-known/jwks.json",
    )
    verifier = SupabaseTokenVerifier(settings)
    assert verifier.configured is False


def test_hs256_mode_rejects_weak_secrets():
    settings = make_settings(supabase_jwt_secret=SecretStr("too-short"))
    assert SupabaseTokenVerifier(settings).configured is False


def test_validation_errors_do_not_echo_password_input():
    with make_client() as client:
        response = client.post("/test/validate", json={"password": "user-secret-value", "extra": "private"})
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"
        assert "user-secret-value" not in response.text
        assert "private" not in response.text


def test_internal_errors_do_not_echo_exception_text():
    with make_client() as client:
        response = client.get("/test/crash")
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "internal_error"
        assert "connection password" not in response.text


def test_database_ready_returns_false_when_database_is_unreachable():
    database = Database("postgresql+psycopg://invalid:invalid@127.0.0.1:1/invalid")
    try:
        assert database.ready() is False
    finally:
        database.close()
