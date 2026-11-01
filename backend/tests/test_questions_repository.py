from contextlib import contextmanager

from app.db.questions import QuestionsRepository


class _Result:
    def __init__(self, *, scalar=None, rows=(), values=()):
        self._scalar = scalar
        self._rows = rows
        self._values = values

    def scalar_one(self):
        return self._scalar

    def mappings(self):
        return self

    def all(self):
        return list(self._values if self._values else self._rows)

    def first(self):
        return self._rows[0] if self._rows else None

    def scalars(self):
        return self


class _Connection:
    def __init__(self, *, total=0, rows=(), subject_values=(), topic_values=()):
        self.total = total
        self.rows = rows
        self.subject_values = subject_values
        self.topic_values = topic_values
        self.statements = []

    def execute(self, statement, params=None):
        sql = str(statement)
        self.statements.append((sql, params or {}))
        if "count(*)" in sql:
            return _Result(scalar=self.total)
        if "SELECT DISTINCT btrim(q.subject)" in sql:
            return _Result(values=self.subject_values)
        if "SELECT DISTINCT btrim(q.topic)" in sql:
            return _Result(values=self.topic_values)
        return _Result(rows=self.rows)


class _Database:
    def __init__(self, connection):
        self.connection = connection

    @contextmanager
    def read_only_transaction(self):
        yield self.connection


def test_list_query_is_published_only_explicit_and_parameterized_with_stable_page():
    connection = _Connection(total=21, rows=[{"id": 21, "status": "published"}])
    repository = QuestionsRepository(_Database(connection))

    rows, total, actual_page = repository.list_page(
        page=99,
        page_size=10,
        filters={
            "exam": "NIMCET' OR true --",
            "section": "Mathematics",
            "subject": None,
            "topic": " Number Theory ",
            "difficulty": "unspecified",
            "year": 2026,
            "question_type": "MCQ",
            "search": " eigenvalue ",
        },
        sort="recent",
    )

    assert (total, actual_page) == (21, 3)
    assert rows == [{"id": 21, "status": "published"}]
    assert len(connection.statements) == 2
    count_sql, params = connection.statements[0]
    page_sql, page_params = connection.statements[1]
    assert "q.status = 'published'" in count_sql
    assert "SELECT *" not in page_sql.upper()
    assert "q.created_at DESC NULLS LAST, q.id DESC" in page_sql
    assert "q.question_number" in page_sql
    assert "NIMCET' OR true --" not in count_sql
    assert params["exam"] == "NIMCET' OR true --"
    assert params["topic"] == "Number Theory"
    assert params["search"] == "eigenvalue"
    assert params["year"] == 2026
    assert page_params["limit"] == 10
    assert page_params["offset"] == 20


def test_detail_uses_verified_bigint_primary_key_and_binds_question_identifier():
    connection = _Connection(rows=[])
    repository = QuestionsRepository(_Database(connection))

    assert repository.get_published("7") is None

    sql, params = connection.statements[0]
    assert "q.status = 'published'" in sql
    assert "q.id = :question_id" in sql
    assert "q.id::text" not in sql
    assert params == {"question_id": 7}


def test_detail_rejects_non_integer_question_id_before_database_access():
    connection = _Connection(rows=[])
    repository = QuestionsRepository(_Database(connection))

    assert repository.get_published("7 OR true") is None
    assert connection.statements == []


def test_facets_only_include_nonempty_published_labels():
    connection = _Connection(subject_values=["Mathematics"], topic_values=["Arithmetic"])
    repository = QuestionsRepository(_Database(connection))

    assert repository.facets() == (["Mathematics"], ["Arithmetic"])
    assert len(connection.statements) == 2
    for sql, _ in connection.statements:
        assert "q.status = 'published'" in sql
        assert "btrim(q." in sql
        assert "ORDER BY value" in sql
