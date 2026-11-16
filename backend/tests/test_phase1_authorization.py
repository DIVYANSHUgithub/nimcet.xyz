from contextlib import contextmanager
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.api.dependencies import require_roles
from app.api.v1.routes.test_authoring import AUTHOR_ROLES, ADMIN_ROLES
from app.core.security import Principal, VerifiedIdentity
from app.db.roles import DatabaseRoleResolver, RoleStorageUnavailable, PrimaryRoleConflict, RoleAssignmentRepository
from test_admin_api import _Database, _ACTOR_ID


@pytest.mark.parametrize('roles', [
    ['editor', 'administrator'], ['editor', 'editor'], ['unknown'],
    ['student', 'unknown'],
])
def test_ambiguous_or_unknown_assignments_fail_closed(roles):
    with pytest.raises(RoleStorageUnavailable):
        DatabaseRoleResolver(_Database(roles=roles)).roles_for(
            VerifiedIdentity(_ACTOR_ID, 'issuer', 'authenticated')
        )


def test_test_manager_is_resolved_from_trusted_storage():
    assert DatabaseRoleResolver(_Database(roles=['test_manager'])).roles_for(
        VerifiedIdentity(_ACTOR_ID, 'issuer', 'authenticated')
    ) == frozenset({'test_manager'})


@pytest.mark.parametrize('role,allowed', [
    ('student', False), ('editor', False), ('test_manager', True),
    ('administrator', True), ('super_administrator', True),
])
def test_authoring_permission_matrix(role, allowed):
    principal = Principal(_ACTOR_ID, frozenset({role}))
    # The dependency has no awaits: drive it directly without Windows socketpair.
    coroutine = require_roles(*AUTHOR_ROLES)(principal)
    if allowed:
        with pytest.raises(StopIteration) as result:
            coroutine.send(None)
        assert result.value.value == principal
    else:
        with pytest.raises(HTTPException) as result:
            coroutine.send(None)
        assert result.value.status_code == 403


def test_test_manager_cannot_publish():
    coroutine = require_roles(*ADMIN_ROLES)(Principal(_ACTOR_ID, frozenset({'test_manager'})))
    with pytest.raises(HTTPException) as result:
        coroutine.send(None)
    assert result.value.status_code == 403


def test_conflicting_grant_stops_before_any_write():
    statements = []

    class Connection:
        def execute(self, statement, params):
            sql = str(statement)
            statements.append(sql)
            assert not any(word in sql for word in ('INSERT', 'UPDATE', 'DELETE'))
            return self

        def scalar_one_or_none(self):
            return 1

    class Database:
        @contextmanager
        def transaction(self):
            yield Connection()

    with pytest.raises(PrimaryRoleConflict):
        RoleAssignmentRepository(Database()).grant(
            user_id=UUID(_ACTOR_ID), role_code='test_manager',
            actor_id=UUID(_ACTOR_ID), reason='Synthetic fixture', request_id='test',
        )
    assert len(statements) == 2
    assert 'pg_advisory_xact_lock' in statements[0]


def test_test_listing_requires_author_role_and_validates_page(monkeypatch):
    from test_admin_api import _Database
    import app.api.v1.routes.test_authoring as route
    calls=[]
    class Repository:
        def list_tests(self,**params): calls.append(params); return []
    monkeypatch.setattr(route,'_repository',lambda request:Repository())
    # Existing helper enables no engine routes by default; opt into the synthetic
    # router through a fresh app rather than any saved environment configuration.
    from app.main import create_app
    from app.core.config import Settings
    from test_admin_api import _Verifier, _Resolver
    from fastapi.testclient import TestClient
    for role,expected in [('student',403),('editor',403),('test_manager',200),('administrator',200)]:
        app=create_app(Settings(_env_file=None,test_engine_enabled=True,log_level='CRITICAL'),database=_Database(),token_verifier=_Verifier(),role_resolver=_Resolver({role}))
        with TestClient(app) as client:
            response=client.get('/api/v1/admin/tests?search=fixture&page=2',headers={'Authorization':'Bearer valid-test-token'})
            assert response.status_code==expected
            if expected==200:
                assert client.get('/api/v1/admin/tests?page=0',headers={'Authorization':'Bearer valid-test-token'}).status_code==422
    assert calls==[{'page':2,'search':'fixture'},{'page':2,'search':'fixture'}]
