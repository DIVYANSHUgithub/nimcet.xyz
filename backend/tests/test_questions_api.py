from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.database import DatabaseUnavailable
from app.main import create_app


def _settings() -> Settings:
    return Settings(
        _env_file=None,
        supabase_url="https://nimcet-test.supabase.co",
        cors_allowed_origins="http://localhost:5173",
        log_level="CRITICAL",
    )


def _question(question_id: int = 7) -> dict:
    return {
        "id": question_id,
        "exam": "NIMCET",
        "exam_year": 2026,
        "section": "Mathematics",
        "question_number": 1,
        "question": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correct_option": 1,
        "explanation": "Basic addition.",
        "subject": "Mathematics",
        "topic": "Arithmetic",
        "difficulty": "easy",
        "source": None,
        "status": "published",
        "created_at": datetime(2026, 1, 1, tzinfo=UTC),
    }


class _Repository:
    def __init__(self, _database, *, questions=None, failure=False):
        self.questions = questions or [_question()]
        self.failure = failure
        self.calls = []

    def _fail_if_configured(self):
        if self.failure:
            raise DatabaseUnavailable

    def list_page(self, *, page, page_size, filters, sort):
        self._fail_if_configured()
        self.calls.append((page, page_size, filters, sort))
        total = len(self.questions)
        last_page = max(1, (total + page_size - 1) // page_size)
        actual_page = min(page, last_page)
        start = (actual_page - 1) * page_size
        return self.questions[start : start + page_size], total, actual_page

    def get_published(self, question_id):
        self._fail_if_configured()
        return next((q for q in self.questions if str(q["id"]) == question_id), None)

    def facets(self):
        self._fail_if_configured()
        return ["Mathematics"], ["Arithmetic"]


class _Database:
    def close(self):
        pass


def _client(monkeypatch, repository: _Repository) -> TestClient:
    import app.api.v1.routes.questions as questions_route

    monkeypatch.setattr(
        questions_route,
        "QuestionsRepository",
        lambda _database: repository,
    )
    app = create_app(settings=_settings(), database=_Database())
    return TestClient(app)


def test_list_questions_returns_published_practice_projection_and_filters(monkeypatch):
    repository = _Repository(None)
    with _client(monkeypatch, repository) as client:
        response = client.get(
            "/api/v1/questions",
            params={
                "page": 1,
                "page_size": 10,
                "exam": "NIMCET",
                "section": "Mathematics",
                "subject": "Mathematics",
                "topic": "Arithmetic",
                "difficulty": "easy",
                "year": 2026,
                "type": "MCQ",
                "search": "  2 + 2  ",
                "sort": "recent",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["has_more"] is False
    assert body["items"][0]["correct_option"] == 1
    assert body["items"][0]["status"] == "published"
    page, size, filters, sort = repository.calls[0]
    assert (page, size, sort) == (1, 10, "recent")
    assert filters == {
        "exam": "NIMCET",
        "section": "Mathematics",
        "subject": "Mathematics",
        "topic": "Arithmetic",
        "difficulty": "easy",
        "year": 2026,
        "question_type": "MCQ",
        "search": "  2 + 2  ",
    }


def test_list_clamps_out_of_range_page_and_all_subject_means_no_filter(monkeypatch):
    repository = _Repository(None, questions=[_question(i) for i in range(1, 22)])
    with _client(monkeypatch, repository) as client:
        response = client.get(
            "/api/v1/questions?page=99&page_size=10&subject=all"
        )

    assert response.status_code == 200
    assert response.json()["page"] == 3
    assert response.json()["has_more"] is False
    assert response.json()["total"] == 21
    assert repository.calls[0][2]["subject"] is None


def test_list_rejects_invalid_pagination_and_sort_values(monkeypatch):
    with _client(monkeypatch, _Repository(None)) as client:
        for query in ("page=0", "page_size=101", "sort=unsafe", "type=essay"):
            response = client.get(f"/api/v1/questions?{query}")
            assert response.status_code == 422
            assert response.json()["error"]["code"] == "validation_error"


def test_detail_returns_published_question_and_hides_missing_or_unpublished(monkeypatch):
    repository = _Repository(None)
    with _client(monkeypatch, repository) as client:
        found = client.get("/api/v1/questions/7")
        missing = client.get("/api/v1/questions/8")

    assert found.status_code == 200
    assert found.json()["id"] == 7
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "question_not_found"


def test_facets_are_returned_in_contract_shape(monkeypatch):
    with _client(monkeypatch, _Repository(None)) as client:
        response = client.get("/api/v1/questions/facets")

    assert response.status_code == 200
    assert response.json() == {
        "subjects": [{"id": "Mathematics", "name": "Mathematics"}],
        "topics": ["Arithmetic"],
    }


def test_database_failure_is_a_generic_503(monkeypatch):
    with _client(monkeypatch, _Repository(None, failure=True)) as client:
        response = client.get("/api/v1/questions")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "database_unavailable"
    assert "password" not in response.text
