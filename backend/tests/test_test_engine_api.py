from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import StudentOnlyRoleResolver, VerifiedIdentity
from app.db.database import DatabaseUnavailable
from app.db.test_engine import AttemptNotFound
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


def _client(repository):
    app = create_app(
        settings=Settings(_env_file=None, cors_allowed_origins="http://localhost:5173"),
        database=_Database(),
        token_verifier=_Verifier(),
        role_resolver=StudentOnlyRoleResolver(),
        test_engine_repository=repository,
    )
    return TestClient(app)


def _auth():
    return {"Authorization": "Bearer test-access-token"}


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
