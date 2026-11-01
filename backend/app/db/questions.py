import unicodedata
from typing import Any

from sqlalchemy import text

from app.db.database import Database


QUESTION_COLUMNS = """
    q.id,
    q.exam,
    q.exam_year,
    q.section,
    q.question_number,
    q.question,
    q.options,
    q.correct_option,
    q.explanation,
    q.subject,
    q.topic,
    q.difficulty,
    q.source,
    q.status,
    q.created_at
"""


def _normalize_search(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(unicodedata.normalize("NFKC", value).split())
    return normalized or None


def _where_clause(filters: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    conditions = ["q.status = 'published'"]
    params: dict[str, Any] = {}

    for key, column in (
        ("exam", "q.exam"),
        ("section", "q.section"),
        ("subject", "q.subject"),
    ):
        value = filters.get(key)
        if value:
            conditions.append(f"{column} = :{key}")
            params[key] = value

    topic = _normalize_search(filters.get("topic"))
    if topic:
        conditions.append("position(lower(:topic) in lower(coalesce(q.topic, ''))) > 0")
        params["topic"] = topic

    difficulty = filters.get("difficulty")
    if difficulty == "unspecified":
        conditions.append("q.difficulty IS NULL")
    elif difficulty:
        conditions.append("q.difficulty = :difficulty")
        params["difficulty"] = difficulty

    year = filters.get("year")
    if year is not None:
        conditions.append("q.exam_year = :year")
        params["year"] = year

    question_type = filters.get("question_type")
    if question_type == "MCQ":
        conditions.append("jsonb_typeof(q.options) = 'array'")
    elif question_type == "Unspecified":
        conditions.append("(q.options IS NULL OR jsonb_typeof(q.options) IS DISTINCT FROM 'array')")

    search = _normalize_search(filters.get("search"))
    if search:
        conditions.append(
            "(" + " OR ".join(
                f"position(lower(:search) in lower(coalesce(q.{column}, ''))) > 0"
                for column in ("question", "topic", "subject", "section")
            ) + ")"
        )
        params["search"] = search

    return " AND ".join(conditions), params


class QuestionsRepository:
    """Read-only access to the existing legacy questions table."""

    def __init__(self, database: Database):
        self.database = database

    def list_page(
        self,
        *,
        page: int,
        page_size: int,
        filters: dict[str, Any],
        sort: str,
    ) -> tuple[list[dict[str, Any]], int, int]:
        where, params = _where_clause(filters)
        count_sql = text(f"SELECT count(*) FROM public.questions AS q WHERE {where}")
        order_sql = (
            "q.question_number ASC NULLS LAST, q.id ASC"
            if sort == "question-number"
            else "q.created_at DESC NULLS LAST, q.id DESC"
        )

        with self.database.read_only_transaction() as connection:
            total = int(connection.execute(count_sql, params).scalar_one())
            last_page = max(1, (total + page_size - 1) // page_size)
            actual_page = min(page, last_page)
            rows = connection.execute(
                text(
                    f"SELECT {QUESTION_COLUMNS} "
                    f"FROM public.questions AS q WHERE {where} "
                    f"ORDER BY {order_sql} LIMIT :limit OFFSET :offset"
                ),
                {**params, "limit": page_size, "offset": (actual_page - 1) * page_size},
            ).mappings().all()
        return [dict(row) for row in rows], total, actual_page

    def get_published(self, question_id: str) -> dict[str, Any] | None:
        try:
            typed_question_id = int(question_id)
        except (TypeError, ValueError):
            return None
        if typed_question_id <= 0:
            return None
        with self.database.read_only_transaction() as connection:
            row = connection.execute(
                text(
                    f"SELECT {QUESTION_COLUMNS} "
                    "FROM public.questions AS q "
                    # index, so replace it with a typed comparison after verification.
                    "WHERE q.status = 'published' AND q.id = :question_id "
                    "LIMIT 1"
                ),
                {"question_id": typed_question_id},
            ).mappings().first()
        return dict(row) if row is not None else None

    def facets(self) -> tuple[list[str], list[str]]:
        with self.database.read_only_transaction() as connection:
            subjects = connection.execute(
                text(
                    "SELECT DISTINCT btrim(q.subject) AS value "
                    "FROM public.questions AS q "
                    "WHERE q.status = 'published' AND q.subject IS NOT NULL "
                    "AND btrim(q.subject) <> '' ORDER BY value"
                )
            ).scalars().all()
            topics = connection.execute(
                text(
                    "SELECT DISTINCT btrim(q.topic) AS value "
                    "FROM public.questions AS q "
                    "WHERE q.status = 'published' AND q.topic IS NOT NULL "
                    "AND btrim(q.topic) <> '' ORDER BY value"
                )
            ).scalars().all()
        return list(subjects), list(topics)
