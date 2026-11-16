import json
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text

from app.core.security import RoleResolver, VerifiedIdentity
from app.db.database import Database, DatabaseUnavailable

ALLOWED_ROLES = frozenset({"student", "editor", "test_manager", "administrator", "super_administrator"})


class RoleStorageUnavailable(Exception):
    """Trusted role assignments could not be checked; authorization must stop."""


class AccountSuspended(Exception):
    pass


class RoleNotFound(Exception):
    pass


class RoleAssignmentNotFound(Exception):
    pass


class PrimaryRoleConflict(Exception):
    pass


class LastSuperAdministrator(Exception):
    pass


@dataclass(frozen=True)
class RoleAssignmentResult:
    assignment_id: str
    user_id: str
    role_code: str
    already_assigned: bool = False


class DatabaseRoleResolver(RoleResolver):
    """Resolve permissions only from active database assignments."""

    def __init__(self, database: Database, check_account_status: bool = False):
        self.database = database
        self.check_account_status = check_account_status

    def roles_for(self, identity: VerifiedIdentity) -> frozenset[str]:
        try:
            user_id = UUID(identity.subject)
        except ValueError:
            raise RoleStorageUnavailable from None
        try:
            with self.database.read_only_transaction() as connection:
                if self.check_account_status:
                    suspended=connection.execute(text("SELECT 1 FROM public.account_status WHERE user_id=:id AND status='suspended' AND(suspended_until IS NULL OR suspended_until>now())"),{'id':user_id}).scalar_one_or_none()
                    if suspended is not None: raise AccountSuspended
                rows = connection.execute(
                    text(
                        "SELECT r.code "
                        "FROM public.user_roles AS ur "
                        "JOIN public.roles AS r ON r.id = ur.role_id "
                        "WHERE ur.user_id = :user_id AND ur.revoked_at IS NULL"
                    ),
                    {"user_id": user_id},
                ).scalars().all()
        except DatabaseUnavailable:
            # A failed lookup is not equivalent to a successful lookup with no
            # assignments. Callers must return unavailable instead of masking it.
            raise RoleStorageUnavailable from None

        # Never combine privileges from conflicting primary assignments or hide
        # unknown role codes by silently treating the account as a student.
        if len(rows) > 1 or any(role not in ALLOWED_ROLES for role in rows):
            raise RoleStorageUnavailable
        return frozenset(rows) or frozenset({"student"})


class RoleAssignmentRepository:
    """Audited trusted role changes; callers must enforce super-admin policy."""

    def __init__(self, database: Database):
        self.database = database

    def grant(
        self,
        *,
        user_id: UUID,
        role_code: str,
        actor_id: UUID,
        reason: str,
        request_id: str,
    ) -> RoleAssignmentResult:
        if role_code not in ALLOWED_ROLES:
            raise RoleNotFound
        with self.database.transaction() as connection:
            # Serialize grants even when this account has no assignment row yet.
            # A database uniqueness constraint remains necessary for other writers.
            connection.execute(
                text("SELECT pg_advisory_xact_lock(hashtextextended(:user_id, 0))"),
                {"user_id": str(user_id)},
            )
            conflicting = connection.execute(
                text(
                    "SELECT 1 FROM public.user_roles AS ur "
                    "JOIN public.roles AS r ON r.id = ur.role_id "
                    "WHERE ur.user_id = :user_id AND ur.revoked_at IS NULL "
                    "AND r.code <> :role_code LIMIT 1"
                ),
                {"user_id": user_id, "role_code": role_code},
            ).scalar_one_or_none()
            if conflicting is not None:
                raise PrimaryRoleConflict
            role_id = connection.execute(
                text(
                    "SELECT id FROM public.roles WHERE code = :role_code"
                    + (" FOR UPDATE" if role_code == "super_administrator" else "")
                ),
                {"role_code": role_code},
            ).scalar_one_or_none()
            if role_id is None:
                raise RoleNotFound
            assignment_id = connection.execute(
                text(
                    "INSERT INTO public.user_roles "
                    "(user_id, role_id, granted_by, grant_reason) "
                    "VALUES (:user_id, :role_id, :actor_id, :reason) "
                    "ON CONFLICT (user_id, role_id) WHERE revoked_at IS NULL DO NOTHING "
                    "RETURNING assignment_id"
                ),
                {"user_id": user_id, "role_id": role_id, "actor_id": actor_id, "reason": reason},
            ).scalar_one_or_none()
            already_assigned = assignment_id is None
            if already_assigned:
                assignment_id = connection.execute(
                    text(
                        "SELECT assignment_id FROM public.user_roles "
                        "WHERE user_id = :user_id AND role_id = :role_id AND revoked_at IS NULL"
                    ),
                    {"user_id": user_id, "role_id": role_id},
                ).scalar_one()
            else:
                connection.execute(
                    text(
                        "INSERT INTO public.admin_audit_log "
                        "(actor_user_id, action_code, entity_type, entity_id, request_id, reason, after_state) "
                        "VALUES (:actor_id, 'role.granted', 'user_role', :entity_id, :request_id, :reason, "
                        "CAST(:after_state AS jsonb))"
                    ),
                    {
                        "actor_id": actor_id,
                        "entity_id": str(assignment_id),
                        "request_id": request_id,
                        "reason": reason,
                        "after_state": json.dumps({"user_id": str(user_id), "role_code": role_code}),
                    },
                )
        return RoleAssignmentResult(
            assignment_id=str(assignment_id),
            user_id=str(user_id),
            role_code=role_code,
            already_assigned=already_assigned,
        )

    def revoke(
        self,
        *,
        user_id: UUID,
        role_code: str,
        actor_id: UUID,
        reason: str,
        request_id: str,
    ) -> RoleAssignmentResult:
        if role_code not in ALLOWED_ROLES:
            raise RoleNotFound
        with self.database.transaction() as connection:
            role_id = connection.execute(
                text(
                    "SELECT id FROM public.roles WHERE code = :role_code"
                    + (" FOR UPDATE" if role_code == "super_administrator" else "")
                ),
                {"role_code": role_code},
            ).scalar_one_or_none()
            if role_id is None:
                raise RoleNotFound
            active_assignment_id = connection.execute(
                text(
                    "SELECT assignment_id FROM public.user_roles "
                    "WHERE user_id = :user_id AND role_id = :role_id AND revoked_at IS NULL "
                    "FOR UPDATE"
                ),
                {"user_id": user_id, "role_id": role_id},
            ).scalar_one_or_none()
            if active_assignment_id is None:
                raise RoleAssignmentNotFound
            if role_code == "super_administrator":
                active_admins = int(connection.execute(
                    text(
                        "SELECT count(*) FROM public.user_roles AS ur "
                        "JOIN public.roles AS r ON r.id = ur.role_id "
                        "WHERE r.code = 'super_administrator' AND ur.revoked_at IS NULL"
                    )
                ).scalar_one())
                if active_admins <= 1:
                    raise LastSuperAdministrator
            assignment = connection.execute(
                text(
                    "UPDATE public.user_roles SET revoked_at = now(), revocation_reason = :reason "
                    "WHERE user_id = :user_id AND role_id = :role_id AND revoked_at IS NULL "
                    "RETURNING assignment_id"
                ),
                {"user_id": user_id, "role_id": role_id, "reason": reason},
            ).scalar_one_or_none()
            if assignment is None:
                raise RoleAssignmentNotFound
            connection.execute(
                text(
                    "INSERT INTO public.admin_audit_log "
                    "(actor_user_id, action_code, entity_type, entity_id, request_id, reason, before_state, after_state) "
                    "VALUES (:actor_id, 'role.revoked', 'user_role', :entity_id, :request_id, :reason, "
                    "CAST(:before_state AS jsonb), CAST(:after_state AS jsonb))"
                ),
                {
                    "actor_id": actor_id,
                    "entity_id": str(assignment),
                    "request_id": request_id,
                    "reason": reason,
                    "before_state": json.dumps({"user_id": str(user_id), "role_code": role_code}),
                    "after_state": json.dumps({"revoked": True}),
                },
            )
        return RoleAssignmentResult(
            assignment_id=str(assignment),
            user_id=str(user_id),
            role_code=role_code,
        )
