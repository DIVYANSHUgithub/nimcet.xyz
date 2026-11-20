from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi.testclient import TestClient
import pytest

from app.core.config import Settings
from app.core.security import StudentOnlyRoleResolver, VerifiedIdentity
from app.db.database import DatabaseUnavailable
from app.db.test_engine import AttemptNotFound, TestEngineRepository as CatalogRepository
from app.domain.test_engine import TestEngineConflict
from app.main import create_app


NOW = datetime(2026, 11, 1, 12, 0, tzinfo=UTC)


class _Verifier:
    @property
    def configured(self):
        return True

    def verify(self, _token):
        return VerifiedIdentity(
            subject=(
                "22222222-2222-4222-8222-222222222222"
                if _token.startswith("other")
                else "11111111-1111-4111-8111-111111111111"
            ),
            issuer="https://nimcet-test.supabase.co/auth/v1",
            audience="authenticated",
        )


class _Database:
    def close(self):
        pass


class _TestEngine:
    def __init__(self):
        self.calls = []
        self.fail = None

    def _check(self):
        if self.fail:
            raise self.fail

    def start_attempt(self, *, test_id, user_id):
        self._check()
        self.calls.append(("start", test_id, user_id))
        return self._session()

    def get_attempt(self, *, attempt_id, user_id):
        self._check()
        if user_id.endswith("2222"):
            raise AttemptNotFound
        self.calls.append(("get", attempt_id, user_id))
        return self._session(attempt_id)

    def save_answer(self, **kwargs):
        self._check()
        self.calls.append(("answer", kwargs))
        return {
            "attempt_question_id": kwargs["attempt_question_id"],
            "selected_option_id": kwargs["selected_option_id"],
            "version": kwargs["expected_version"] + 1,
            "saved_at": NOW,
        }

    def save_navigation(self, **kwargs):
        self._check()
        self.calls.append(("navigation", kwargs))
        return {
            "current_attempt_question_id": kwargs["current_attempt_question_id"],
            "marked_for_review": kwargs["marked_for_review"],
        }

    def submit_attempt(self, **kwargs):
        self._check()
        self.calls.append(("submit", kwargs))
        return {
            "attempt_id": kwargs["attempt_id"],
            "status": "submitted",
            "submission_reason": "student_submitted",
            "submitted_at": NOW,
        }

    @staticmethod
    def _session(attempt_id="22222222-2222-4222-8222-222222222222"):
        return {
            "attempt_id": attempt_id,
            "test_id": "33333333-3333-4333-8333-333333333333",
            "test_version_id": "44444444-4444-4444-8444-444444444444",
            "status": "in_progress",
            "started_at": NOW,
            "deadline_at": NOW + timedelta(minutes=30),
            "server_time": NOW,
            "remaining_seconds": 1800,
            "questions": [
                {
                    "attempt_question_id": "55555555-5555-4555-8555-555555555555",
                    "question_id": 11,
                    "section_id": "66666666-6666-4666-8666-666666666666",
                    "section_title": "Mathematics",
                    "display_order": 0,
                    "question": "Safe session prompt",
                    "options": [
                        {"id": "option-0", "content": "A"},
                        {"id": "option-1", "content": "B"},
                    ],
                    "answer": {"selected_option_id": None, "version": 0, "saved_at": None},
                    "state": {"visited": False, "marked_for_review": False},
                }
            ],
        }


def _client(repository, roles=None):
    class _Roles:
        def roles_for(self, _identity):
            return frozenset(roles)

    app = create_app(
        settings=Settings(_env_file=None,
                           cors_allowed_origins="http://localhost:5173",
                           test_engine_enabled=True
                           ),
        database=_Database(),
        token_verifier=_Verifier(),
        role_resolver=StudentOnlyRoleResolver() if roles is None else _Roles(),
        test_engine_repository=repository,
    )
    return TestClient(app)


def _auth():
    return {"Authorization": "Bearer test-access-token"}


def test_public_catalog_shows_test_summaries_and_keeps_attempts_private():
    owner = UUID('11111111-1111-4111-8111-111111111111')
    attempt = '22222222-2222-4222-8222-222222222222'
    test = '33333333-3333-4333-8333-333333333333'

    class CatalogDatabase:
        @contextmanager
        def read_only_transaction(self):
            yield self

        def scalar_one(self):
            return 1

        def mappings(self):
            return self

        def all(self):
            return self.rows

        def execute(self, statement, params=None):
            sql = str(statement)
            assert "t.status='published' AND t.visibility='public' AND t.kind<>'pyq'" in sql
            if params is not None:
                assert 'a.user_id=:user_id' in sql
                active = params['user_id'] == owner
                self.rows = [dict(id=test, title='Public fixture', kind='full_length', examination_code='NIMCET',
                                  duration_seconds=1800, question_count=1, available_from=None, available_until=None,
                                  attempts_used=int(active), attempt_limit=2, active_attempt_id=attempt if active else None)]
            return self

    with _client(CatalogRepository(CatalogDatabase())) as client:
        guest = client.get('/api/v1/tests')
        assert guest.status_code == 200
        assert guest.headers['cache-control'] == 'private, no-store'
        item = guest.json()['items'][0]
        assert item['title'] == 'Public fixture'
        assert item['active_attempt_id'] is None and item['attempts_used'] == 0
        assert 'questions' not in item
        signed_in = client.get('/api/v1/tests', headers=_auth())
        assert signed_in.json()['items'][0]['active_attempt_id'] == attempt
        other = client.get('/api/v1/tests', headers={'Authorization': 'Bearer other-student'})
        assert other.json()['items'][0] == item
        assert client.post(f'/api/v1/tests/{test}/attempts').status_code == 401
        assert client.get(f'/api/v1/attempts/{attempt}').status_code == 401
        assert client.post(f'/api/v1/attempts/{attempt}/submit', json={}).status_code == 401


def test_attempt_images_use_attempt_ownership_and_review_policy(monkeypatch):
    from fastapi import Response
    from app.api.v1.routes import test_engine

    diagram = '11111111-2222-4333-8444-000000000001'
    option = '11111111-2222-4333-8444-000000000002'
    explanation = '11111111-2222-4333-8444-000000000003'

    def image(media_id):
        return {'type': 'image', 'media_id': media_id, 'alt': 'A diagram'}

    class Engine(_TestEngine):
        def get_attempt(self, **kwargs):
            payload = super().get_attempt(**kwargs)
            question = payload['questions'][0]
            question['statement_blocks'] = [image(diagram)]
            question['options'][0]['content'] = {'blocks': [image(option)]}
            return payload

        def get_attempt_review(self, **kwargs):
            if not self.review_released:
                raise AttemptNotFound
            payload = self.get_attempt(**kwargs)
            payload['questions'][0]['explanation_blocks'] = [image(explanation)]
            return payload

    monkeypatch.setattr(test_engine, 'read_registered_media', lambda *_: Response(media_type='image/png'))
    engine = Engine()
    engine.review_released = False
    media = '/api/v1/attempts/22222222-2222-4222-8222-222222222222/media/'
    with _client(engine) as client:
        for media_id in (diagram, option):
            assert client.get(media + media_id, headers=_auth()).headers['content-type'] == 'image/png'
        assert client.get(media + diagram, headers={'Authorization': 'Bearer other-student'}).status_code == 404
        assert client.get(media + explanation, headers=_auth()).status_code == 404
        assert client.get(media + explanation + '?review=true', headers=_auth()).status_code == 404
        engine.review_released = True
        assert client.get(media + explanation + '?review=true', headers=_auth()).status_code == 200


@pytest.mark.parametrize('role', ['student', 'editor', 'test_manager', 'administrator', 'super_administrator'])
def test_each_app_role_can_practice_but_cannot_read_another_users_attempt(role):
    repository = _TestEngine()
    with _client(repository, roles=[role]) as client:
        own = client.get('/api/v1/attempts/22222222-2222-4222-8222-222222222222', headers=_auth())
        foreign = client.get('/api/v1/attempts/22222222-2222-4222-8222-222222222222', headers={'Authorization': 'Bearer other-user-2222'})
    assert own.status_code == 200
    assert foreign.status_code == 404
    assert repository.calls == [('get', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111')]


def test_start_and_recovery_return_safe_session_projection():
    repository = _TestEngine()
    with _client(repository) as client:
        started = client.post("/api/v1/tests/33333333-3333-4333-8333-333333333333/attempts", headers=_auth())
        recovered = client.get("/api/v1/attempts/22222222-2222-4222-8222-222222222222", headers=_auth())
    assert started.status_code == 201
    assert recovered.status_code == 200
    assert started.json()["remaining_seconds"] == 1800
    assert "correct_option" not in started.text
    assert "explanation" not in started.text
    assert repository.calls[0][0] == "start"
    assert repository.calls[1][0] == "get"



def test_attempt_routes_require_authentication_and_hide_foreign_attempts():
    with _client(_TestEngine()) as client:
        unauthenticated = client.get("/api/v1/attempts/22222222-2222-4222-8222-222222222222")
        foreign = client.get(
            "/api/v1/attempts/22222222-2222-4222-8222-222222222222",
            headers={"Authorization": "Bearer other-user-2222"},
        )
    assert unauthenticated.status_code == 401
    assert foreign.status_code == 404


def test_student_role_cannot_use_admin_test_authoring_routes():
    with _client(_TestEngine()) as client:
        created = client.post(
            "/api/v1/admin/tests",
            json={
                "title": "Practice set",
                "kind": "custom",
                "visibility": "public",
                "examination_code": "NIMCET",
            },
            headers=_auth(),
        )
        published = client.post(
            "/api/v1/admin/tests/33333333-3333-4333-8333-333333333333/versions/44444444-4444-4444-8444-444444444444/publish",
            headers=_auth(),
        )
    assert created.status_code == 403
    assert published.status_code == 403


def test_answer_navigation_and_submit_contracts_reject_client_scoring():
    repository = _TestEngine()
    with _client(repository) as client:
        answer = client.put(
            "/api/v1/attempts/22222222-2222-4222-8222-222222222222/answers/55555555-5555-4555-8555-555555555555",
            json={"selected_option_id": "option-1", "expected_version": 0},
            headers=_auth(),
        )
        navigation = client.put(
            "/api/v1/attempts/22222222-2222-4222-8222-222222222222/navigation",
            json={"current_attempt_question_id": "55555555-5555-4555-8555-555555555555", "marked_for_review": True},
            headers=_auth(),
        )
        submitted = client.post(
            "/api/v1/attempts/22222222-2222-4222-8222-222222222222/submit",
            json={"reason": "student_submitted"},
            headers=_auth(),
        )
        invalid = client.post(
            "/api/v1/attempts/22222222-2222-4222-8222-222222222222/submit",
            json={"reason": "student_submitted", "score": 999},
            headers=_auth(),
        )
    assert answer.status_code == 200
    assert answer.json()["version"] == 1
    assert navigation.status_code == 200 and navigation.json()["marked_for_review"] is True
    assert submitted.status_code == 200
    assert "score" not in submitted.json()
    assert invalid.status_code == 422


def test_stale_answer_version_and_database_failure_have_safe_errors():
    repository = _TestEngine()
    repository.fail = TestEngineConflict("answer_version_conflict")
    with _client(repository) as client:
        conflict = client.put(
            "/api/v1/attempts/22222222-2222-4222-8222-222222222222/answers/55555555-5555-4555-8555-555555555555",
            json={"selected_option_id": "option-0", "expected_version": 2},
            headers=_auth(),
        )
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "answer_version_conflict"

    repository.fail = DatabaseUnavailable()
    with _client(repository) as client:
        unavailable = client.post(
            "/api/v1/tests/33333333-3333-4333-8333-333333333333/attempts",
            headers=_auth(),
        )
    assert unavailable.status_code == 503
    assert unavailable.json()["error"]["message"] == "The test service is temporarily unavailable."
