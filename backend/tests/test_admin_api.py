from contextlib import contextmanager
from uuid import UUID

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import VerifiedIdentity
from app.db.database import DatabaseUnavailable
from app.db.roles import DatabaseRoleResolver, LastSuperAdministrator
from app.main import create_app

_ACTOR_ID = "d1412600-46f2-4c6f-88a3-5e238328e58e"
_TARGET_ID = "3ac2f9c8-6a30-4c04-8626-67cc896b2ec7"


class _Result:
    def __init__(self, *, roles=(), row=None):
        self.roles = roles
        self.row = row

    def scalars(self):
        return self

    def all(self):
        return list(self.roles)

    def mappings(self):
        return self

    def one(self):
        return self.row


class _Connection:
    def __init__(self, *, roles=(), row=None):
        self.roles = roles
        self.row = row
        self.statements = []

    def execute(self, statement, params=None):
        self.statements.append((str(statement), params or {}))
        if self.row is not None:
            return _Result(row=self.row)
        return _Result(roles=self.roles)


class _Database:
    def __init__(self, *, roles=(), row=None, unavailable=False):
        self.connection = _Connection(roles=roles, row=row)
        self.unavailable = unavailable

    @contextmanager
    def read_only_transaction(self):
        if self.unavailable:
            raise DatabaseUnavailable
        yield self.connection

    def close(self):
        pass


class _Verifier:
    configured = True

    def verify(self, token):
        assert token == "valid-test-token"
        return VerifiedIdentity(
            subject=_ACTOR_ID,
            issuer="https://test.example/auth/v1",
            audience="authenticated",
        )


class _Resolver:
    def __init__(self, roles):
        self.roles = frozenset(roles)

    def roles_for(self, _identity):
        return self.roles


def _client(database, roles):
    settings = Settings(
        _env_file=None,
        supabase_url="https://test.example",
        cors_allowed_origins="http://localhost:5173",
        log_level="CRITICAL",
    )
    app = create_app(
        settings=settings,
        database=database,
        token_verifier=_Verifier(),
        role_resolver=_Resolver(roles),
    )
    return TestClient(app, raise_server_exceptions=False)


def test_role_resolver_reads_only_active_allowlisted_assignments():
    database = _Database(roles=["editor", "student", "unexpected_role"])
    resolver = DatabaseRoleResolver(database)
    identity = VerifiedIdentity(_ACTOR_ID, "https://test.example/auth/v1", "authenticated")

    assert resolver.roles_for(identity) == frozenset({"editor", "student"})
    sql, params = database.connection.statements[0]
    assert "ur.revoked_at IS NULL" in sql
    assert "JOIN public.roles" in sql
    assert params == {"user_id": UUID(_ACTOR_ID)}


def test_role_resolver_defaults_to_student_and_fails_closed_on_storage_error():
    identity = VerifiedIdentity(_ACTOR_ID, "https://test.example/auth/v1", "authenticated")
    assert DatabaseRoleResolver(_Database()).roles_for(identity) == frozenset({"student"})
    assert DatabaseRoleResolver(_Database(unavailable=True)).roles_for(identity) == frozenset({"student"})


def test_admin_dashboard_requires_backend_role_before_reading_counts():
    database = _Database(row={
        "total_questions": 102,
        "published_questions": 102,
        "draft_questions": 0,
    })
    with _client(database, {"student"}) as client:
        response = client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": "Bearer valid-test-token"},
        )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "insufficient_role"
    assert database.connection.statements == []


def test_admin_dashboard_returns_read_only_question_counts_to_editor():
    database = _Database(row={
        "total_questions": 102,
        "published_questions": 102,
        "draft_questions": 0,
    })
    with _client(database, {"editor"}) as client:
        response = client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": "Bearer valid-test-token"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "total_questions": 102,
        "published_questions": 102,
        "draft_questions": 0,
    }
    assert len(database.connection.statements) == 1
    assert "FROM public.questions" in database.connection.statements[0][0]


class _ScalarResult:
    def __init__(self, value=None):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalar_one(self):
        return self.value


class _WriteConnection:
    def __init__(self, responses):
        self.responses = list(responses)
        self.statements = []

    def execute(self, statement, params=None):
        self.statements.append((str(statement), params or {}))
        value = self.responses.pop(0) if self.responses else None
        return _ScalarResult(value)


class _WriteDatabase:
    def __init__(self, responses):
        self.connection = _WriteConnection(responses)
        self.transaction_count = 0

    @contextmanager
    def transaction(self):
        self.transaction_count += 1
        yield self.connection

    def close(self):
        pass


class _AuditResult:
    def __init__(self, *, count=None, rows=()):
        self.count = count
        self.rows = rows

    def scalar_one(self):
        return self.count

    def mappings(self):
        return self

    def all(self):
        return list(self.rows)


class _AuditConnection:
    def __init__(self, total, rows):
        self.total = total
        self.rows = rows
        self.statements = []

    def execute(self, statement, params=None):
        self.statements.append((str(statement), params or {}))
        if "count(*)" in str(statement):
            return _AuditResult(count=self.total)
        return _AuditResult(rows=self.rows)


class _AuditDatabase:
    def __init__(self, total, rows):
        self.connection = _AuditConnection(total, rows)

    @contextmanager
    def read_only_transaction(self):
        yield self.connection

    def close(self):
        pass


def test_superadmin_role_grant_is_audited_in_same_transaction():
    assignment_id = "3f849dec-5121-4fa1-a36c-720d3bff8a07"
    database = _WriteDatabase([4, assignment_id, None])
    target_id = _TARGET_ID
    with _client(database, {"super_administrator"}) as client:
        response = client.post(
            f"/api/v1/admin/users/{target_id}/roles/editor",
            headers={"Authorization": "Bearer valid-test-token"},
            json={"reason": "Appointing the question review editor"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "assignment_id": assignment_id,
        "user_id": target_id,
        "role_code": "editor",
        "already_assigned": False,
    }
    assert database.transaction_count == 1
    assert len(database.connection.statements) == 3
    assert "INSERT INTO public.admin_audit_log" in database.connection.statements[-1][0]


def test_admin_cannot_change_own_role_and_non_superadmin_cannot_manage_roles():
    target_id = _ACTOR_ID
    with _client(_WriteDatabase([]), {"super_administrator"}) as client:
        self_change = client.post(
            f"/api/v1/admin/users/{target_id}/roles/editor",
            headers={"Authorization": "Bearer valid-test-token"},
            json={"reason": "Attempting a self role change"},
        )
    assert self_change.status_code == 409
    assert self_change.json()["error"]["code"] == "self_role_change_forbidden"

    database = _WriteDatabase([])
    with _client(database, {"administrator"}) as client:
        denied = client.post(
            f"/api/v1/admin/users/{_TARGET_ID}/roles/editor",
            headers={"Authorization": "Bearer valid-test-token"},
            json={"reason": "Granting an editor role"},
        )
    assert denied.status_code == 403
    assert database.transaction_count == 0


def test_role_reason_validation_and_last_superadmin_revocation_guard():
    database = _WriteDatabase([4, "active-assignment-id", 1])
    from app.db.roles import RoleAssignmentRepository

    try:
        RoleAssignmentRepository(database).revoke(
            user_id=UUID(_TARGET_ID),
            role_code="super_administrator",
            actor_id=UUID(_ACTOR_ID),
            reason="Security role rotation",
            request_id="request-123",
        )
    except LastSuperAdministrator:
        pass
    else:
        raise AssertionError("The last super administrator must not be revocable.")
    assert len(database.connection.statements) == 3
    assert "FOR UPDATE" in database.connection.statements[0][0]

    with _client(_WriteDatabase([]), {"super_administrator"}) as client:
        invalid = client.post(
            "/api/v1/admin/users/d1412600-46f2-4c6f-88a3-5e238328e58e/roles/editor",
            headers={"Authorization": "Bearer valid-test-token"},
            json={"reason": "  short  "},
        )
    assert invalid.status_code == 422


def test_superadmin_role_revocation_is_audited_in_the_transaction():
    assignment_id = "9d7da06a-7341-41e0-b65d-b78a0d70bfa9"
    database = _WriteDatabase([4, assignment_id, 2, assignment_id, None])
    with _client(database, {"super_administrator"}) as client:
        response = client.request(
            "DELETE",
            f"/api/v1/admin/users/{_TARGET_ID}/roles/super_administrator",
            headers={"Authorization": "Bearer valid-test-token"},
            json={"reason": "Rotating an administrator assignment"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "assignment_id": assignment_id,
        "user_id": _TARGET_ID,
        "role_code": "super_administrator",
        "already_assigned": False,
    }
    assert database.transaction_count == 1
    sql = [statement for statement, _ in database.connection.statements]
    assert "FOR UPDATE" in sql[0]
    assert "FOR UPDATE" in sql[1]
    assert any(statement.startswith("UPDATE public.user_roles") for statement in sql)
    assert "INSERT INTO public.admin_audit_log" in sql[-1]


def test_duplicate_role_grant_is_idempotent_and_does_not_write_audit():
    assignment_id = "588e8620-8e89-47c2-831e-1a5201de6472"
    database = _WriteDatabase([2, None, assignment_id])
    from app.db.roles import RoleAssignmentRepository

    result = RoleAssignmentRepository(database).grant(
        user_id=UUID(_TARGET_ID),
        role_code="administrator",
        actor_id=UUID(_ACTOR_ID),
        reason="Maintaining existing admin access",
        request_id="request-456",
    )

    assert result.assignment_id == assignment_id
    assert result.already_assigned is True
    assert len(database.connection.statements) == 3
    assert not any("admin_audit_log" in statement for statement, _ in database.connection.statements)


def test_audit_log_is_superadmin_only_paginated_and_redacts_unapproved_diff_fields():
    database = _AuditDatabase(
        3,
        [{
            "id": "9d7da06a-7341-41e0-b65d-b78a0d70bfa9",
            "actor_user_id": UUID(_ACTOR_ID),
            "action_code": "role.granted",
            "entity_type": "user_role",
            "entity_id": "assignment-123",
            "request_id": "request-123",
            "reason": "Adding a reviewer",
            "before_state": None,
            "after_state": {"user_id": _TARGET_ID, "role_code": "editor", "password": "must-not-leak"},
            "created_at": "2026-11-01T00:00:00Z",
        }],
    )
    with _client(database, {"super_administrator"}) as client:
        response = client.get(
            "/api/v1/admin/audit-log?page=99&page_size=2",
            headers={"Authorization": "Bearer valid-test-token"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 2
    assert body["total"] == 3
    assert body["has_more"] is False
    assert body["items"][0]["after_state"] == {"user_id": _TARGET_ID, "role_code": "editor"}
    assert "must-not-leak" not in response.text
    assert database.connection.statements[1][1] == {"limit": 2, "offset": 2}
