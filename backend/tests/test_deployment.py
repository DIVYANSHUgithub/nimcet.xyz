from unittest.mock import MagicMock, patch

from pydantic import SecretStr
from app.core.config import Settings
from app.core.deployment import deployment_errors
from app.db.database import Database


def release_settings(tmp_path, **changes):
    cert = tmp_path / "ca.crt"
    cert.write_text("test certificate fixture")
    values = dict(_env_file=None, environment="production",
                  supabase_url="https://project.supabase.co",
                  supabase_jwt_issuer="https://project.supabase.co/auth/v1",
                  supabase_jwks_url="https://project.supabase.co/auth/v1/.well-known/jwks.json",
                  supabase_jwt_audience="authenticated", supabase_jwt_mode="jwks",
                  supabase_jwt_algorithm="ES256", cors_allowed_origins="https://nimcet.xyz",
                  test_engine_enabled=True, trusted_role_lookup_enabled=True,
                  database_url=SecretStr("postgresql+psycopg://nimcet_backend:fake@db.supabase.co/postgres?sslmode=verify-full"),
                  database_ssl_root_cert=str(cert))
    values.update(changes)
    return Settings(**values)


def test_release_config_accepts_portable_cert_and_explicit_auth(tmp_path):
    assert deployment_errors(release_settings(tmp_path)) == []


def test_invalid_database_url_reports_a_safe_configuration_error(tmp_path):
    errors = deployment_errors(release_settings(tmp_path, database_url=SecretStr("invalid-private-value")))
    assert errors == ["Set a valid server-only DATABASE_URL."]


def test_release_blocks_local_cors_unverified_tls_and_unmigrated_features(tmp_path):
    errors = deployment_errors(release_settings(tmp_path, cors_allowed_origins="http://localhost:5173",
        database_url=SecretStr("postgresql+psycopg://postgres:fake@db.supabase.co/postgres?sslmode=require"),
        phase5_enabled=True, database_ssl_root_cert="missing-file.crt"))
    assert len(errors) == 5
    assert "fake" not in str(errors)


def test_database_bounds_pool_and_overrides_old_certificate_path(tmp_path):
    cert = tmp_path / "ca.crt"
    cert.write_text("fixture")
    with patch("app.db.database.create_engine") as create:
        Database("postgresql://runtime:fake@db.supabase.co/postgres?sslmode=verify-full&sslrootcert=C:/old/ca.crt",
                 ssl_root_cert=str(cert), pool_size=2)
    args, options = create.call_args
    assert args[0].drivername == "postgresql+psycopg"
    assert args[0].query["sslrootcert"] == str(cert)
    assert options["pool_size"] == 2 and options["max_overflow"] == 0
    assert options["pool_timeout"] == 3
    assert options["connect_args"]["connect_timeout"] == 2


def test_timeouts_are_applied_inside_each_transaction_for_pooler_compatibility():
    database = Database(None)
    database.engine = MagicMock()
    database.engine.dialect.name = "postgresql"
    connection = MagicMock()
    database._configure_transaction(connection)
    sql = str(connection.execute.call_args.args[0])
    assert "set_config('statement_timeout', '8s', true)" in sql
    assert "set_config('lock_timeout', '3s', true)" in sql
