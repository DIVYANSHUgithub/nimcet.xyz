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

CATALOG_CHAPTER = ("COALESCE((SELECT btrim(c.name) FROM public.topics st "
                   "JOIN public.chapters c ON c.id=st.chapter_id WHERE st.id=q.subtopic_id), btrim(q.topic))")


def _normalize_search(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(unicodedata.normalize("NFKC", value).split())
    return normalized or None


def _where_clause(filters: dict[str, Any], rich_content: bool = False) -> tuple[str, dict[str, Any]]:
    conditions = ["q.status = 'published'"]
    params: dict[str, Any] = {}

    for key, column in (
        ("exam", "q.exam"),
        ("section", "q.section"),
        ("subject", "q.subject"),
    ):
        value = filters.get(key)
        if value:
            if not rich_content or key == "subject":
                conditions.append(f"{column} = :{key}")
            params[key] = value

    topic = _normalize_search(filters.get("topic"))
    if topic:
        conditions.append("position(lower(:topic) in lower(coalesce(q.topic, ''))) > 0")
        params["topic"] = topic

    chapter = filters.get('chapter')
    if chapter:
        conditions.append(f"{CATALOG_CHAPTER if rich_content else 'btrim(q.topic)'} = :chapter")
        params['chapter'] = chapter

    difficulty = filters.get("difficulty")
    if difficulty == "unspecified":
        conditions.append("q.difficulty IS NULL")
    elif difficulty:
        conditions.append("lower(q.difficulty) = lower(:difficulty)")
        params["difficulty"] = difficulty

    year = filters.get("year")
    if year is not None:
        if not rich_content:
            conditions.append("q.exam_year = :year")
        params["year"] = year

    if filters.get('subtopic_id'):
        conditions.append('q.subtopic_id = :subtopic_id' if rich_content else 'false')
        params['subtopic_id'] = filters['subtopic_id']
    if rich_content:
        metadata = [(key, legacy, occurrence) for key, legacy, occurrence in
                    [('exam','q.exam','o.exam'), ('section','q.section','o.section'), ('year','q.exam_year','o.year')]
                    if key in params]
        occurrence = 'EXISTS (SELECT 1 FROM public.question_occurrences o WHERE o.question_id=q.id'
        occurrence += ''.join(f' AND {column}=:{key}' for key, _, column in metadata) + ')'
        if filters.get('pyq'):
            conditions.append(occurrence)
        elif metadata:
            legacy = ' AND '.join(f'{column}=:{key}' for key,column,_ in metadata)
            conditions.append(f'(({legacy}) OR {occurrence})')
    elif filters.get('pyq'):
        conditions.append('false')
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
                for column in ("topic", "subject", "section")
            ) + " OR position(lower(:search) in lower(coalesce(to_jsonb(q.question) #>> '{}', ''))) > 0)"
        )
        params["search"] = search

    return " AND ".join(conditions), params


class QuestionsRepository:
    """Read-only access to the existing legacy questions table."""

    def __init__(self, database: Database, rich_content: bool = False):
        self.database = database
        self.rich_content = rich_content
        self.columns = QUESTION_COLUMNS + (", q.content_document, q.revision" if rich_content else "")

    def list_page(
        self,
        *,
        page: int,
        page_size: int,
        filters: dict[str, Any],
        sort: str,
    ) -> tuple[list[dict[str, Any]], int, int]:
        where, params = _where_clause(filters, self.rich_content)
        columns = self.columns
        if self.rich_content and filters.get('pyq'):
            columns += (", ARRAY(SELECT DISTINCT o.year FROM public.question_occurrences o "
                        "WHERE o.question_id=q.id ORDER BY o.year DESC) AS pyq_years, "
                        "(SELECT name FROM public.topics WHERE id=q.subtopic_id) AS pyq_topic, "
                        f"{CATALOG_CHAPTER} AS pyq_chapter")
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
                    f"SELECT {columns} "
                    f"FROM public.questions AS q WHERE {where} "
                    f"ORDER BY {order_sql} LIMIT :limit OFFSET :offset"
                ),
                {**params, "limit": page_size, "offset": (actual_page - 1) * page_size},
            ).mappings().all()
        return [dict(row) for row in rows], total, actual_page

    def pyq_facets(self) -> dict[str, list]:
        if not self.rich_content:
            return {'years': [], 'taxonomy': []}

        with self.database.read_only_transaction() as connection:
            years = connection.execute(text(
                "SELECT DISTINCT o.year FROM public.question_occurrences o "
                "JOIN public.questions q ON q.id=o.question_id WHERE q.status='published' ORDER BY o.year DESC"
            )).scalars().all()
            taxonomy = connection.execute(text(
                "SELECT DISTINCT q.subject, COALESCE(btrim(c.name), btrim(q.topic)) AS chapter, st.id AS topic_id, st.name AS topic "
                "FROM public.questions q LEFT JOIN public.topics st ON st.id=q.subtopic_id "
                "LEFT JOIN public.chapters c ON c.id=st.chapter_id "
                "WHERE q.status='published' "
                "AND EXISTS (SELECT 1 FROM public.question_occurrences o WHERE o.question_id=q.id) "
                "ORDER BY q.subject, chapter, topic, topic_id"
            )).mappings().all()
        return {'years': list(years), 'taxonomy': [dict(row) for row in taxonomy]}

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
                    f"SELECT {self.columns} "
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
