"""One-time, owner-operated bootstrap for the first NIMCET.XYZ super admin.

All configuration is read from explicitly named process environment variables.
This command deliberately does not load backend/.env and never prints secrets.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import sys
from uuid import UUID
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError


class BootstrapError(Exception):
    pass


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise BootstrapError(f"Required environment variable {name} is not set.")
    return value


def bootstrap(database_url: str, owner_role: str, user_id: UUID, reason: str) -> str:
    """Atomically assign the role and audit it, only when no super admin exists."""
    engine = None
    try:
        engine = create_engine(
            database_url,
            pool_pre_ping=True,
            hide_parameters=True,
            connect_args={"connect_timeout": 5},
        )
        with engine.begin() as connection:
            session_user, current_user, is_superuser, can_bypass_rls = connection.execute(
                text("SELECT session_user, current_user, r.rolsuper, r.rolbypassrls "
                     "FROM pg_roles AS r WHERE r.rolname = current_user"),
            ).one()
            if session_user != owner_role or current_user != owner_role:
                raise BootstrapError("Connected database role does not match BOOTSTRAP_OWNER_ROLE.")
            if not (is_superuser or can_bypass_rls):
                raise BootstrapError("Connected role is not a trusted server-side operator with RLS bypass.")

            required_objects = connection.execute(text(
                "SELECT to_regclass('auth.users'), to_regclass('public.roles'), "
                "to_regclass('public.user_roles'), to_regclass('public.admin_audit_log')"
            )).one()
            if any(value is None for value in required_objects):
                raise BootstrapError("Auth or trusted-role tables are missing; apply and verify the migration first.")
            required_privileges = connection.execute(text(
                "SELECT has_table_privilege(current_user, 'auth.users', 'SELECT'), "
                "has_table_privilege(current_user, 'public.roles', 'SELECT'), "
                "has_table_privilege(current_user, 'public.user_roles', 'SELECT'), "
                "has_table_privilege(current_user, 'public.user_roles', 'INSERT'), "
                "has_table_privilege(current_user, 'public.admin_audit_log', 'INSERT')"
            )).one()
            if not all(required_privileges):
                raise BootstrapError("Connected role lacks required Auth, role, or audit table privileges.")

            # Transaction-scoped advisory lock serializes all copies of this command.
            connection.execute(text("SELECT pg_advisory_xact_lock(746128310221)"))
            auth_exists = connection.execute(
                text("SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = :user_id)"),
                {"user_id": user_id},
            ).scalar_one()
            if not auth_exists:
                raise BootstrapError("Target UUID is absent from auth.users; no change made.")

            role_id = connection.execute(
                text("SELECT id FROM public.roles WHERE code = 'super_administrator' FOR UPDATE")
            ).scalar_one_or_none()
            if role_id is None:
                raise BootstrapError("Expected super_administrator role is missing; apply/review migration first.")
            prior_bootstrap = connection.execute(
                text("SELECT EXISTS ("
                     "SELECT 1 FROM public.user_roles WHERE role_id = :role_id"
                     ") OR EXISTS ("
                     "SELECT 1 FROM public.admin_audit_log "
                     "WHERE action_code = 'role.bootstrap_first_super_administrator'"
                     ")"),
                {"role_id": role_id},
            ).scalar_one()
            if prior_bootstrap:
                raise BootstrapError("A super-administrator assignment or bootstrap record already exists; bootstrap is one-time only.")

            assignment_id = connection.execute(
                text("INSERT INTO public.user_roles (user_id, role_id, granted_by, grant_reason) "
                     "VALUES (:user_id, :role_id, NULL, :reason) RETURNING assignment_id"),
                {"user_id": user_id, "role_id": role_id, "reason": reason},
            ).scalar_one()
            connection.execute(
                text("INSERT INTO public.admin_audit_log "
                     "(actor_user_id, action_code, entity_type, entity_id, request_id, reason, after_state) "
                     "VALUES (NULL, 'role.bootstrap_first_super_administrator', 'user_role', :entity_id, "
                     ":request_id, :reason, CAST(:after_state AS jsonb))"),
                {
                    "entity_id": str(assignment_id),
                    "request_id": f"first-super-admin-bootstrap:{assignment_id}",
                    "reason": reason,
                    "after_state": json.dumps({"user_id": str(user_id), "role_code": "super_administrator"}),
                },
            )
        return str(assignment_id)
    except SQLAlchemyError as exc:
        # Do not print driver exception content, which can include connection details.
        raise BootstrapError("Database operation failed; transaction rolled back. Check schema and owner grants.") from exc
    finally:
        if engine is not None:
            engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--user-id", required=True, help="Existing Supabase Auth UUID to receive the first role")
    parser.add_argument("--confirm-user-id", required=True, help="Must exactly match --user-id")
    parser.add_argument("--reason", required=True, help="Owner-approved reason recorded in the audit row")
    args = parser.parse_args()
    try:
        target = UUID(args.user_id)
        confirmed = UUID(args.confirm_user_id)
        if str(target) != args.user_id.lower() or str(confirmed) != args.confirm_user_id.lower():
            raise BootstrapError("Provide both UUIDs in canonical hyphenated form.")
        if target != confirmed:
            raise BootstrapError("Confirmation UUID does not match the target UUID.")
        reason = args.reason.strip()
        if not reason:
            raise BootstrapError("A non-empty audit reason is required.")
        owner_role = required_env("BOOTSTRAP_OWNER_ROLE")
        database_url = required_env("BOOTSTRAP_DATABASE_URL")
        project_url = required_env("BOOTSTRAP_SUPABASE_URL")
        expected_project_ref = required_env("BOOTSTRAP_EXPECTED_PROJECT_REF")
        if not re.fullmatch(r"[a-z0-9]{20}", expected_project_ref):
            raise BootstrapError("BOOTSTRAP_EXPECTED_PROJECT_REF must be the 20-character Supabase project ref.")
        project = urlparse(project_url)
        if project.scheme != "https" or project.hostname != f"{expected_project_ref}.supabase.co":
            raise BootstrapError("BOOTSTRAP_SUPABASE_URL does not match BOOTSTRAP_EXPECTED_PROJECT_REF.")
        try:
            parsed_database_url = make_url(database_url)
        except SQLAlchemyError as exc:
            raise BootstrapError("BOOTSTRAP_DATABASE_URL is invalid; no database connection was opened.") from exc
        if parsed_database_url.drivername == "postgresql":
            parsed_database_url = parsed_database_url.set(drivername="postgresql+psycopg")
        if parsed_database_url.drivername not in ("postgresql+psycopg", "postgresql+psycopg2"):
            raise BootstrapError("BOOTSTRAP_DATABASE_URL must use PostgreSQL with the supported driver.")
        if parsed_database_url.query.get("sslmode", "").lower() not in ("require", "verify-ca", "verify-full"):
            raise BootstrapError("BOOTSTRAP_DATABASE_URL must require TLS with sslmode=require or stronger.")
        db_host = (parsed_database_url.host or "").lower()
        direct_host = db_host == f"db.{expected_project_ref}.supabase.co"
        pooler_host = db_host.endswith(".pooler.supabase.com") and expected_project_ref in (parsed_database_url.username or "")
        if not (direct_host or pooler_host):
            raise BootstrapError("BOOTSTRAP_DATABASE_URL does not identify the expected Supabase project.")
        print(f"Target Auth UUID: {target}")
        print(f"Expected database owner role: {owner_role}")
        final_confirmation = getpass.getpass("Type the target Auth UUID to execute bootstrap: ").strip()
        if final_confirmation != str(target):
            raise BootstrapError("Final UUID confirmation did not match; no change made.")
        assignment_id = bootstrap(
            parsed_database_url.render_as_string(hide_password=False), owner_role, target, reason
        )
        print(f"Bootstrap committed. Assignment ID: {assignment_id}")
        print("Audit action: role.bootstrap_first_super_administrator")
        return 0
    except (BootstrapError, ValueError) as exc:
        print(f"Bootstrap stopped: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
