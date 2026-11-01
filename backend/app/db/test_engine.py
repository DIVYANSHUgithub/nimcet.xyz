from __future__ import annotations

import random
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text

from app.db.database import Database
from app.domain.test_engine import (
    QuestionSnapshot,
    TestEngineConflict,
    TestEngineForbidden,
    evaluate_attempt,
    idempotent_submission,
    remaining_seconds,
    session_projection,
    submission_reason,
    validate_answer_write,
    validate_navigation,
)


class AttemptNotFound(Exception):
    pass


def _as_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except (ValueError, TypeError, AttributeError):
        raise AttemptNotFound from None


def _question_snapshot(row: dict[str, Any]) -> QuestionSnapshot:
    options = row["options_snapshot"]
    if not isinstance(options, list) or len(options) != 4:
        raise ValueError("invalid_test_question_snapshot")
    return QuestionSnapshot(
        attempt_question_id=str(row["attempt_question_id"]),
        question_id=int(row["question_id"]),
        section_id=str(row["section_id"]),
        section_title=row["section_title"],
        display_order=int(row["display_order"]),
        question=row["question_snapshot"],
        options=tuple(options),
        correct_option=int(row["correct_option_snapshot"]),
        marks=Decimal(str(row["marks"])),
        negative_marks=Decimal(str(row["negative_marks"])),
        option_order=tuple(int(index) for index in row["option_order"]),
    )


def _policy_time(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return result if result.utcoffset() is not None else None


def _result_release_time(policy: dict[str, Any], submitted_at: datetime | None, now: datetime) -> datetime | None:
    if submitted_at is None:
        return None
    mode = policy.get("results", "after_submit")
    if mode == "after_submit":
        return submitted_at
    release_at = _policy_time(policy.get("results_at")) if mode == "at_time" else None
    return release_at if release_at is not None and release_at <= now else None


def _review_release_time(
    policy: dict[str, Any], result_release: datetime | None, now: datetime
) -> datetime | None:
    mode = policy.get("answers", "with_results")
    if mode == "with_results":
        return result_release
    if mode == "at_time":
        release_at = _policy_time(policy.get("answers_at"))
        return release_at if release_at is not None and release_at <= now else None
    return None


class TestEngineRepository:
    """Transactional test attempt operations over the Phase 8 draft schema."""

    def __init__(self, database: Database):
        self.database = database

    def get_attempt_result(self, *, attempt_id: str, user_id: str) -> dict[str, Any]:
        attempt_uuid, user_uuid = map(_as_uuid, (attempt_id, user_id))
        with self.database.read_only_transaction() as connection:
            row = connection.execute(
                text(
                    "SELECT a.id AS attempt_id,a.status,t.id AS test_id,t.title AS test_title,"
                    "s.submission_reason,s.submitted_at AS submission_time,v.review_policy,"
                    "r.score,r.maximum_score,r.correct_count,r.incorrect_count,r.unanswered_count,"
                    "r.released_at,clock_timestamp() AS server_time "
                    "FROM public.test_attempts a JOIN public.test_versions v ON v.id=a.test_version_id "
                    "JOIN public.tests t ON t.id=v.test_id "
                    "LEFT JOIN public.test_submissions s ON s.attempt_id=a.id "
                    "LEFT JOIN public.test_results r ON r.attempt_id=a.id "
                    "WHERE a.id=:attempt_id AND a.user_id=:user_id"
                ),
                {"attempt_id": attempt_uuid, "user_id": user_uuid},
            ).mappings().first()
            if row is None or row["status"] not in {"submitted", "expired"} or row["score"] is None:
                raise AttemptNotFound
            policy = row["review_policy"] if isinstance(row["review_policy"], dict) else {}
            released_at = _result_release_time(policy, row["submission_time"], row["server_time"])
            if released_at is None:
                raise AttemptNotFound
            review_release = _review_release_time(policy, released_at, row["server_time"])
            sections = connection.execute(
                text(
                    "SELECT sr.test_section_id AS section_id,ts.title,sr.score,sr.maximum_score,"
                    "sr.correct_count,sr.incorrect_count,sr.unanswered_count "
                    "FROM public.section_results sr JOIN public.test_sections ts ON ts.id=sr.test_section_id "
                    "WHERE sr.attempt_id=:attempt_id ORDER BY ts.display_order"
                ),
                {"attempt_id": attempt_uuid},
            ).mappings().all()
        return {
            "attempt_id": str(row["attempt_id"]),
            "test_id": str(row["test_id"]),
            "test_title": row["test_title"],
            "status": row["status"],
            "submission_reason": row["submission_reason"],
            "submitted_at": row["submission_time"],
            "score": row["score"],
            "maximum_score": row["maximum_score"],
            "correct_count": row["correct_count"],
            "incorrect_count": row["incorrect_count"],
            "unanswered_count": row["unanswered_count"],
            "released_at": row["released_at"] or released_at,
            "review_released": review_release is not None,
            "sections": [
                {
                    "section_id": str(section["section_id"]),
                    "title": section["title"],
                    "score": section["score"],
                    "maximum_score": section["maximum_score"],
                    "correct_count": section["correct_count"],
                    "incorrect_count": section["incorrect_count"],
                    "unanswered_count": section["unanswered_count"],
                }
                for section in sections
            ],
        }

    def get_attempt_review(self, *, attempt_id: str, user_id: str) -> dict[str, Any]:
        attempt_uuid, user_uuid = map(_as_uuid, (attempt_id, user_id))
        with self.database.read_only_transaction() as connection:
            attempt = connection.execute(
                text(
                    "SELECT a.status,t.title AS test_title,s.submitted_at,v.review_policy,"
                    "clock_timestamp() AS server_time FROM public.test_attempts a "
                    "JOIN public.test_versions v ON v.id=a.test_version_id "
                    "JOIN public.tests t ON t.id=v.test_id "
                    "LEFT JOIN public.test_submissions s ON s.attempt_id=a.id "
                    "WHERE a.id=:attempt_id AND a.user_id=:user_id"
                ),
                {"attempt_id": attempt_uuid, "user_id": user_uuid},
            ).mappings().first()
            if attempt is None or attempt["status"] not in {"submitted", "expired"}:
                raise AttemptNotFound
            policy = attempt["review_policy"] if isinstance(attempt["review_policy"], dict) else {}
            result_release = _result_release_time(policy, attempt["submitted_at"], attempt["server_time"])
            review_release = _review_release_time(policy, result_release, attempt["server_time"])
            if review_release is None:
                raise AttemptNotFound
            rows = connection.execute(
                text(
                    "SELECT aq.display_order,ts.title AS section_title,tq.question_snapshot,tq.options_snapshot,"
                    "tq.correct_option_snapshot,tq.explanation_snapshot,aq.option_order,aa.selected_option_id,"
                    "COALESCE(tq.marks,ts.default_marks) AS marks,"
                    "COALESCE(tq.negative_marks,ts.default_negative_marks) AS negative_marks "
                    "FROM public.attempt_questions aq JOIN public.test_questions tq ON tq.id=aq.test_question_id "
                    "JOIN public.test_sections ts ON ts.id=tq.test_section_id "
                    "LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id=aq.id "
                    "WHERE aq.attempt_id=:attempt_id ORDER BY aq.display_order"
                ),
                {"attempt_id": attempt_uuid},
            ).mappings().all()
        questions = []
        for item in rows:
            options = item["options_snapshot"]
            option_order = item["option_order"]
            if not isinstance(options, list) or len(options) != 4 or not isinstance(option_order, list):
                raise ValueError("invalid_test_question_snapshot")
            try:
                option_order = [int(index) for index in option_order]
            except (TypeError, ValueError):
                raise ValueError("invalid_test_question_snapshot") from None
            if sorted(option_order) != [0, 1, 2, 3]:
                raise ValueError("invalid_test_question_snapshot")
            selected = item["selected_option_id"]
            correct_id = f"option-{int(item['correct_option_snapshot'])}"
            marks = Decimal(str(item["marks"]))
            negative = Decimal(str(item["negative_marks"]))
            earned = Decimal("0") if selected is None else (marks if selected == correct_id else -negative)
            questions.append({
                "display_order": int(item["display_order"]),
                "section_title": item["section_title"],
                "question": item["question_snapshot"],
                "options": [
                    {"id": f"option-{index}", "content": options[index]}
                    for index in option_order
                ],
                "selected_option_id": selected,
                "correct_option_id": correct_id,
                "is_correct": selected == correct_id if selected is not None else False,
                "explanation": item["explanation_snapshot"],
                "marks_awarded": earned,
                "marks_available": marks,
            })
        return {
            "attempt_id": str(attempt_uuid),
            "test_title": attempt["test_title"],
            "released_at": review_release,
            "questions": questions,
        }

    def list_student_attempts(self, *, user_id: str, page: int = 1, page_size: int = 20) -> dict[str, Any]:
        user_uuid = _as_uuid(user_id)
        page = max(1, int(page))
        page_size = min(50, max(1, int(page_size)))
        offset = (page - 1) * page_size
        with self.database.read_only_transaction() as connection:
            total = int(connection.execute(
                text("SELECT count(*) FROM public.test_attempts WHERE user_id=:user_id"),
                {"user_id": user_uuid},
            ).scalar_one())
            rows = connection.execute(
                text(
                    "SELECT a.id AS attempt_id,t.id AS test_id,t.title AS test_title,a.status,a.started_at,"
                    "a.submitted_at,v.review_policy,r.score,r.maximum_score,clock_timestamp() AS server_time "
                    "FROM public.test_attempts a JOIN public.test_versions v ON v.id=a.test_version_id "
                    "JOIN public.tests t ON t.id=v.test_id LEFT JOIN public.test_results r ON r.attempt_id=a.id "
                    "WHERE a.user_id=:user_id ORDER BY a.started_at DESC,a.id LIMIT :limit OFFSET :offset"
                ),
                {"user_id": user_uuid, "limit": page_size, "offset": offset},
            ).mappings().all()
        items = []
        for row in rows:
            policy = row["review_policy"] if isinstance(row["review_policy"], dict) else {}
            result_release = _result_release_time(policy, row["submitted_at"], row["server_time"])
            result_released = result_release is not None and row["score"] is not None
            review_release = (
                _review_release_time(policy, result_release, row["server_time"])
                if row["status"] in {"submitted", "expired"}
                else None
            )
            items.append({
                "attempt_id": str(row["attempt_id"]),
                "test_id": str(row["test_id"]),
                "test_title": row["test_title"],
                "status": row["status"],
                "started_at": row["started_at"],
                "submitted_at": row["submitted_at"],
                "score": row["score"] if result_released else None,
                "maximum_score": row["maximum_score"] if result_released else None,
                "result_released": result_released,
                "review_released": review_release is not None,
            })
        return {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total": total,
            "has_more": offset + len(items) < total,
        }

    def get_student_analytics(self, *, user_id: str) -> dict[str, Any]:
        user_uuid = _as_uuid(user_id)
        with self.database.read_only_transaction() as connection:
            rows = connection.execute(
                text(
                    "SELECT a.status,a.submitted_at,v.review_policy,r.score,r.maximum_score,"
                    "clock_timestamp() AS server_time FROM public.test_attempts a "
                    "JOIN public.test_versions v ON v.id=a.test_version_id "
                    "LEFT JOIN public.test_results r ON r.attempt_id=a.id WHERE a.user_id=:user_id"
                ),
                {"user_id": user_uuid},
            ).mappings().all()
        percentages = []
        completed_count = 0
        for row in rows:
            if row["status"] in {"submitted", "expired"}:
                completed_count += 1
            policy = row["review_policy"] if isinstance(row["review_policy"], dict) else {}
            maximum = Decimal(str(row["maximum_score"])) if row["maximum_score"] is not None else Decimal("0")
            if (row["score"] is not None and maximum > 0
                    and _result_release_time(policy, row["submitted_at"], row["server_time"]) is not None):
                percentages.append(Decimal(str(row["score"])) / maximum * Decimal("100"))
        average = (sum(percentages, Decimal("0")) / len(percentages)).quantize(Decimal("0.01")) if percentages else None
        best = max(percentages).quantize(Decimal("0.01")) if percentages else None
        return {
            "attempts_count": len(rows),
            "completed_count": completed_count,
            "released_results_count": len(percentages),
            "average_percentage": average,
            "best_percentage": best,
        }

    def list_public_tests(self, *, user_id: str, page: int = 1, page_size: int = 12) -> dict[str, Any]:
        user_uuid = _as_uuid(user_id)
        page = max(1, int(page))
        page_size = min(50, max(1, int(page_size)))
        offset = (page - 1) * page_size
        with self.database.read_only_transaction() as connection:
            total = int(connection.execute(
                text(
                    "SELECT count(*) FROM public.tests AS t "
                    "WHERE t.status='published' AND t.visibility='public' "
                    "AND EXISTS (SELECT 1 FROM public.test_versions v "
                    "WHERE v.test_id=t.id AND v.status='published')"
                )
            ).scalar_one())
            rows = connection.execute(
                text(
                    "WITH latest AS ("
                    "SELECT DISTINCT ON (test_id) id,test_id,duration_seconds,attempt_limit,"
                    "available_from,available_until,version_number FROM public.test_versions "
                    "WHERE status='published' ORDER BY test_id,version_number DESC"
                    ") SELECT t.id,t.title,t.kind,t.examination_code,v.duration_seconds,"
                    "v.available_from,v.available_until,v.attempt_limit,v.version_number,"
                    "count(DISTINCT q.id)::integer AS question_count,"
                    "count(DISTINCT a.id)::integer AS attempts_used,"
                    "(array_agg(a.id ORDER BY a.started_at DESC) FILTER (WHERE a.status='in_progress'))[1] AS active_attempt_id "
                    "FROM public.tests t JOIN latest v ON v.test_id=t.id "
                    "JOIN public.test_sections s ON s.test_version_id=v.id "
                    "JOIN public.test_questions q ON q.test_section_id=s.id "
                    "LEFT JOIN public.test_attempts a ON a.test_version_id=v.id AND a.user_id=:user_id "
                    "WHERE t.status='published' AND t.visibility='public' "
                    "GROUP BY t.id,t.title,t.kind,t.examination_code,v.duration_seconds,"
                    "v.available_from,v.available_until,v.attempt_limit,v.version_number "
                    "ORDER BY t.created_at DESC,t.id LIMIT :limit OFFSET :offset"
                ),
                {"user_id": user_uuid, "limit": page_size, "offset": offset},
            ).mappings().all()
        return {
            "items": [
                {
                    "id": str(row["id"]),
                    "title": row["title"],
                    "kind": row["kind"],
                    "examination_code": row["examination_code"],
                    "duration_seconds": int(row["duration_seconds"]),
                    "question_count": int(row["question_count"]),
                    "available_from": row["available_from"],
                    "available_until": row["available_until"],
                    "attempts_used": int(row["attempts_used"]),
                    "attempt_limit": int(row["attempt_limit"]),
                    "active_attempt_id": str(row["active_attempt_id"]) if row["active_attempt_id"] else None,
                }
                for row in rows
            ],
            "page": page,
            "page_size": page_size,
            "total": total,
            "has_more": offset + len(rows) < total,
        }

    def start_attempt(self, *, test_id: str, user_id: str) -> dict[str, Any]:
        test_uuid = _as_uuid(test_id)
        user_uuid = _as_uuid(user_id)
        active_id = None
        with self.database.transaction() as connection:
            version = connection.execute(
                text(
                    "SELECT t.id AS test_id, t.visibility, t.owner_id, t.status AS test_status, "
                    "v.id AS test_version_id, v.status AS version_status, v.duration_seconds, "
                    "v.attempt_limit, v.available_from, v.available_until, v.shuffle_questions, "
                    "v.shuffle_options, clock_timestamp() AS server_time "
                    "FROM public.tests AS t JOIN public.test_versions AS v ON v.test_id = t.id "
                    "WHERE t.id = :test_id AND t.status = 'published' AND v.status = 'published' "
                    "AND (t.visibility = 'public' OR t.owner_id = :user_id) "
                    "ORDER BY v.version_number DESC LIMIT 1 FOR UPDATE OF v"
                ),
                {"test_id": test_uuid, "user_id": user_uuid},
            ).mappings().first()
            if version is None:
                raise TestEngineForbidden("test_unavailable")

            active = connection.execute(
                text(
                    "SELECT id FROM public.test_attempts "
                    "WHERE test_version_id = :version_id AND user_id = :user_id "
                    "AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1"
                ),
                {"version_id": version["test_version_id"], "user_id": user_uuid},
            ).scalar_one_or_none()
            if active is not None:
                active_id = str(active)
            else:
                attempts_used = int(connection.execute(
                    text(
                        "SELECT count(*) FROM public.test_attempts "
                        "WHERE test_version_id = :version_id AND user_id = :user_id"
                    ),
                    {"version_id": version["test_version_id"], "user_id": user_uuid},
                ).scalar_one())
                if version["test_status"] != "published":
                    raise TestEngineForbidden("test_unavailable")
                if version["visibility"] == "private" and version["owner_id"] != user_uuid:
                    raise TestEngineForbidden("test_unavailable")
                if version["available_from"] is not None and version["server_time"] < version["available_from"]:
                    raise TestEngineForbidden("test_not_started")
                if version["available_until"] is not None and version["server_time"] >= version["available_until"]:
                    raise TestEngineForbidden("test_closed")
                if attempts_used >= int(version["attempt_limit"]):
                    raise TestEngineForbidden("attempt_limit_reached")

                attempt_id = uuid4()
                attempt_number = attempts_used + 1
                started_at = version["server_time"]
                deadline_at = started_at + timedelta(seconds=int(version["duration_seconds"]))
                attempt = connection.execute(
                    text(
                        "INSERT INTO public.test_attempts "
                        "(id,test_version_id,user_id,attempt_number,status,started_at,deadline_at) "
                        "VALUES (:id,:version_id,:user_id,:number,'in_progress',:started_at,:deadline_at) RETURNING id"
                    ),
                    {
                        "id": attempt_id,
                        "version_id": version["test_version_id"],
                        "user_id": user_uuid,
                        "number": attempt_number,
                        "started_at": started_at,
                        "deadline_at": deadline_at,
                    },
                ).scalar_one()

                items = connection.execute(
                    text(
                        "SELECT q.id AS test_question_id, q.test_section_id, s.title AS section_title, "
                        "s.display_order AS section_order, q.display_order AS question_order, "
                        "q.question_snapshot, q.options_snapshot "
                        "FROM public.test_questions AS q "
                        "JOIN public.test_sections AS s ON s.id = q.test_section_id "
                        "WHERE s.test_version_id = :version_id "
                        "ORDER BY s.display_order, q.display_order"
                    ),
                    {"version_id": version["test_version_id"]},
                ).mappings().all()
                if not items:
                    raise TestEngineForbidden("test_has_no_questions")
                ordered = list(items)
                if version["shuffle_questions"]:
                    random.SystemRandom().shuffle(ordered)
                for display_order, item in enumerate(ordered):
                    options = item["options_snapshot"]
                    if not isinstance(options, list) or len(options) != 4:
                        raise ValueError("invalid_test_question_snapshot")
                    option_order = list(range(len(options)))
                    if version["shuffle_options"]:
                        random.SystemRandom().shuffle(option_order)
                    connection.execute(
                        text(
                            "INSERT INTO public.attempt_questions "
                            "(attempt_id,test_question_id,display_order,option_order,visited,marked_for_review) "
                            "VALUES (:attempt_id,:test_question_id,:display_order,CAST(:option_order AS jsonb),false,false)"
                        ),
                        {
                            "attempt_id": attempt,
                            "test_question_id": item["test_question_id"],
                            "display_order": display_order,
                            "option_order": __import__("json").dumps(option_order),
                        },
                    )
                active_id = str(attempt)
        return self.get_attempt(attempt_id=active_id, user_id=user_id)

    def get_attempt(self, *, attempt_id: str, user_id: str) -> dict[str, Any]:
        attempt_uuid = _as_uuid(attempt_id)
        user_uuid = _as_uuid(user_id)
        with self.database.read_only_transaction() as connection:
            state = connection.execute(
                text(
                    "SELECT id AS attempt_id, test_version_id, user_id, status, started_at, deadline_at, "
                    "clock_timestamp() AS server_time "
                    "FROM public.test_attempts WHERE id=:attempt_id AND user_id=:user_id"
                ),
                {"attempt_id": attempt_uuid, "user_id": user_uuid},
            ).mappings().first()
        if state is None:
            raise AttemptNotFound
        if state["status"] == "in_progress" and state["server_time"] >= state["deadline_at"]:
            self.submit_attempt(attempt_id=attempt_id, user_id=user_id)

        with self.database.read_only_transaction() as connection:
            attempt = connection.execute(
                text(
                    "SELECT a.id AS attempt_id, t.id AS test_id, t.title AS test_title, v.id AS test_version_id, a.status, "
                    "a.started_at, a.deadline_at, clock_timestamp() AS server_time "
                    "FROM public.test_attempts AS a "
                    "JOIN public.test_versions AS v ON v.id=a.test_version_id "
                    "JOIN public.tests AS t ON t.id=v.test_id "
                    "WHERE a.id=:attempt_id AND a.user_id=:user_id"
                ),
                {"attempt_id": attempt_uuid, "user_id": user_uuid},
            ).mappings().first()
            if attempt is None:
                raise AttemptNotFound
            rows = connection.execute(
                text(
                    "SELECT aq.id AS attempt_question_id, q.question_id, q.test_section_id AS section_id, "
                    "s.title AS section_title, aq.display_order, q.question_snapshot, q.options_snapshot, "
                    "q.correct_option_snapshot, COALESCE(q.marks,s.default_marks) AS marks, "
                    "COALESCE(q.negative_marks,s.default_negative_marks) AS negative_marks, "
                    "aq.option_order, aq.visited, aq.marked_for_review, "
                    "aa.selected_option_id, COALESCE(aa.version,0) AS answer_version, aa.saved_at "
                    "FROM public.attempt_questions AS aq "
                    "JOIN public.test_questions AS q ON q.id=aq.test_question_id "
                    "JOIN public.test_sections AS s ON s.id=q.test_section_id "
                    "LEFT JOIN public.attempt_answers AS aa ON aa.attempt_question_id=aq.id "
                    "WHERE aq.attempt_id=:attempt_id ORDER BY aq.display_order"
                ),
                {"attempt_id": attempt_uuid},
            ).mappings().all()
        snapshots = [_question_snapshot(dict(row)) for row in rows]
        answers = {
            str(row["attempt_question_id"]): {
                "selected_option_id": row["selected_option_id"],
                "version": row["answer_version"],
                "saved_at": row["saved_at"],
            }
            for row in rows
        }
        navigation = {
            str(row["attempt_question_id"]): {
                "visited": row["visited"],
                "marked_for_review": row["marked_for_review"],
            }
            for row in rows
        }
        return session_projection(
            attempt=dict(attempt),
            questions=snapshots,
            answers=answers,
            navigation=navigation,
            server_time=attempt["server_time"],
        )

    def save_answer(
        self,
        *,
        attempt_id: str,
        attempt_question_id: str,
        user_id: str,
        selected_option_id: str | None,
        expected_version: int,
    ) -> dict[str, Any]:
        attempt_uuid, question_uuid, user_uuid = map(_as_uuid, (attempt_id, attempt_question_id, user_id))
        with self.database.transaction() as connection:
            row = connection.execute(
                text(
                    "SELECT a.status, a.deadline_at, q.options_snapshot, aq.id AS attempt_question_id, "
                    "clock_timestamp() AS server_time FROM public.test_attempts AS a "
                    "JOIN public.attempt_questions AS aq ON aq.attempt_id=a.id "
                    "JOIN public.test_questions AS q ON q.id=aq.test_question_id "
                    "WHERE a.id=:attempt_id AND a.user_id=:user_id AND aq.id=:question_id FOR UPDATE OF a"
                ),
                {"attempt_id": attempt_uuid, "user_id": user_uuid, "question_id": question_uuid},
            ).mappings().first()
            if row is None:
                raise AttemptNotFound
            options = row["options_snapshot"]
            option_ids = {f"option-{index}" for index in range(len(options))} if isinstance(options, list) else set()
            validate_answer_write(
                status=row["status"],
                deadline_at=row["deadline_at"],
                now=row["server_time"],
                option_ids=option_ids,
                selected_option_id=selected_option_id,
            )
            saved = connection.execute(
                text(
                    "INSERT INTO public.attempt_answers (attempt_question_id,selected_option_id,version,saved_at) "
                    "SELECT :question_id,:selected_option_id,1,clock_timestamp() WHERE :expected_version=0 "
                    "ON CONFLICT (attempt_question_id) DO UPDATE SET "
                    "selected_option_id=EXCLUDED.selected_option_id, "
                    "version=public.attempt_answers.version+1, saved_at=clock_timestamp() "
                    "WHERE public.attempt_answers.version=:expected_version "
                    "RETURNING attempt_question_id,selected_option_id,version,saved_at"
                ),
                {
                    "question_id": question_uuid,
                    "selected_option_id": selected_option_id,
                    "expected_version": expected_version,
                },
            ).mappings().first()
            if saved is None:
                raise TestEngineConflict("answer_version_conflict")
            connection.execute(
                text(
                    "UPDATE public.attempt_questions SET visited=true, "
                    "first_seen_at=COALESCE(first_seen_at,clock_timestamp()),last_seen_at=clock_timestamp() "
                    "WHERE id=:question_id"
                ),
                {"question_id": question_uuid},
            )
        return {
            "attempt_question_id": str(saved["attempt_question_id"]),
            "selected_option_id": saved["selected_option_id"],
            "version": int(saved["version"]),
            "saved_at": saved["saved_at"],
        }

    def save_navigation(
        self,
        *,
        attempt_id: str,
        user_id: str,
        current_attempt_question_id: str,
        marked_for_review: bool,
    ) -> dict[str, Any]:
        attempt_uuid, user_uuid, question_uuid = map(
            _as_uuid, (attempt_id, user_id, current_attempt_question_id)
        )
        with self.database.transaction() as connection:
            attempt = connection.execute(
                text(
                    "SELECT status,deadline_at,clock_timestamp() AS server_time FROM public.test_attempts "
                    "WHERE id=:attempt_id AND user_id=:user_id FOR UPDATE"
                ),
                {"attempt_id": attempt_uuid, "user_id": user_uuid},
            ).mappings().first()
            if attempt is None:
                raise AttemptNotFound
            validate_answer_write(
                status=attempt["status"],
                deadline_at=attempt["deadline_at"],
                now=attempt["server_time"],
                option_ids=set(),
                selected_option_id=None,
            )
            question = connection.execute(
                text(
                    "SELECT id,display_order FROM public.attempt_questions "
                    "WHERE id=:question_id AND attempt_id=:attempt_id FOR UPDATE"
                ),
                {"question_id": question_uuid, "attempt_id": attempt_uuid},
            ).mappings().first()
            if question is None:
                raise TestEngineForbidden("question_not_in_attempt")
            validate_navigation(
                attempt_question_ids={str(question["id"])},
                current_attempt_question_id=str(question["id"]),
                marked_for_review=marked_for_review,
            )
            connection.execute(
                text(
                    "UPDATE public.attempt_questions SET visited=true,marked_for_review=:marked, "
                    "first_seen_at=COALESCE(first_seen_at,clock_timestamp()),last_seen_at=clock_timestamp() "
                    "WHERE id=:question_id"
                ),
                {"question_id": question_uuid, "marked": marked_for_review},
            )
            connection.execute(
                text(
                    "UPDATE public.test_attempts SET current_display_order=:display_order, "
                    "updated_at=clock_timestamp() WHERE id=:attempt_id"
                ),
                {"display_order": question["display_order"], "attempt_id": attempt_uuid},
            )
        return {"current_attempt_question_id": str(question_uuid), "marked_for_review": marked_for_review}

    def submit_attempt(self, *, attempt_id: str, user_id: str) -> dict[str, Any]:
        attempt_uuid, user_uuid = map(_as_uuid, (attempt_id, user_id))
        with self.database.transaction() as connection:
            attempt = connection.execute(
                text(
                    "SELECT a.id,a.status,a.deadline_at,v.review_policy,clock_timestamp() AS server_time "
                    "FROM public.test_attempts AS a JOIN public.test_versions AS v ON v.id=a.test_version_id "
                    "WHERE a.id=:attempt_id AND a.user_id=:user_id FOR UPDATE OF a"
                ),
                {"attempt_id": attempt_uuid, "user_id": user_uuid},
            ).mappings().first()
            if attempt is None:
                raise AttemptNotFound
            stored = connection.execute(
                text(
                    "SELECT s.submission_reason, s.submitted_at, r.score, r.maximum_score, "
                    "r.correct_count, r.incorrect_count, r.unanswered_count "
                    "FROM public.test_submissions AS s JOIN public.test_results AS r USING (attempt_id) "
                    "WHERE s.attempt_id=:attempt_id"
                ),
                {"attempt_id": attempt_uuid},
            ).mappings().first()
            replay = idempotent_submission(status=attempt["status"], stored_result=dict(stored) if stored else None)
            if replay is not None:
                reason = replay["submission_reason"]
                submitted_at = replay["submitted_at"]
                status = "expired" if reason == "timer_expired" else "submitted"
                return {
                    "attempt_id": str(attempt_uuid),
                    "status": status,
                    "submission_reason": reason,
                    "submitted_at": submitted_at,
                }

            reason = submission_reason(
                requested_reason="student_submitted",
                deadline_at=attempt["deadline_at"],
                now=attempt["server_time"],
            )
            rows = connection.execute(
                text(
                    "SELECT aq.id AS attempt_question_id, ts.id AS section_id, ts.title AS section_title, "
                    "tq.correct_option_snapshot, COALESCE(tq.marks,ts.default_marks) AS marks, "
                    "COALESCE(tq.negative_marks,ts.default_negative_marks) AS negative_marks, "
                    "aa.selected_option_id "
                    "FROM public.attempt_questions AS aq "
                    "JOIN public.test_questions AS tq ON tq.id=aq.test_question_id "
                    "JOIN public.test_sections AS ts ON ts.id=tq.test_section_id "
                    "LEFT JOIN public.attempt_answers AS aa ON aa.attempt_question_id=aq.id "
                    "WHERE aq.attempt_id=:attempt_id ORDER BY aq.display_order"
                ),
                {"attempt_id": attempt_uuid},
            ).mappings().all()
            snapshots = [
                QuestionSnapshot(
                    attempt_question_id=str(row["attempt_question_id"]),
                    question_id=0,
                    section_id=str(row["section_id"]),
                    section_title=row["section_title"],
                    display_order=index,
                    question="",
                    options=("", "", "", ""),
                    correct_option=int(row["correct_option_snapshot"]),
                    marks=Decimal(str(row["marks"])),
                    negative_marks=Decimal(str(row["negative_marks"])),
                    option_order=(0, 1, 2, 3),
                )
                for index, row in enumerate(rows)
            ]
            answers = {str(row["attempt_question_id"]): row["selected_option_id"] for row in rows}
            result = evaluate_attempt(questions=snapshots, answers=answers)
            terminal_status = "expired" if reason == "timer_expired" else "submitted"
            submitted_at = attempt["server_time"]
            policy = attempt["review_policy"] if isinstance(attempt["review_policy"], dict) else {}
            result_schedule = _policy_time(policy.get("results_at")) if policy.get("results") == "at_time" else None
            released_at = submitted_at if policy.get("results", "after_submit") == "after_submit" else (
                result_schedule if result_schedule is not None and result_schedule <= submitted_at else None
            )
            connection.execute(
                text(
                    "INSERT INTO public.test_submissions (attempt_id,submission_reason,submitted_at) "
                    "VALUES (:attempt_id,:reason,:submitted_at)"
                ),
                {"attempt_id": attempt_uuid, "reason": reason, "submitted_at": submitted_at},
            )
            connection.execute(
                text(
                    "UPDATE public.test_attempts SET status=:status,submitted_at=:submitted_at, "
                    "submission_reason=:reason,updated_at=:submitted_at WHERE id=:attempt_id"
                ),
                {
                    "status": terminal_status,
                    "submitted_at": submitted_at,
                    "reason": reason,
                    "attempt_id": attempt_uuid,
                },
            )
            connection.execute(
                text(
                    "INSERT INTO public.test_results "
                    "(attempt_id,score,maximum_score,correct_count,incorrect_count,unanswered_count,released_at) "
                    "VALUES (:attempt_id,:score,:maximum,:correct,:incorrect,:unanswered,:released_at)"
                ),
                {
                    "attempt_id": attempt_uuid,
                    "score": result["score"],
                    "maximum": result["maximum_score"],
                    "correct": result["correct"],
                    "incorrect": result["incorrect"],
                    "unanswered": result["unanswered"],
                    "released_at": released_at,
                },
            )
            for section in result["sections"]:
                connection.execute(
                    text(
                        "INSERT INTO public.section_results "
                        "(attempt_id,test_section_id,score,maximum_score,correct_count,incorrect_count,unanswered_count) "
                        "VALUES (:attempt_id,:section_id,:score,:maximum,:correct,:incorrect,:unanswered)"
                    ),
                    {
                        "attempt_id": attempt_uuid,
                        "section_id": section["section_id"],
                        "score": section["score"],
                        "maximum": section["maximum_score"],
                        "correct": section["correct"],
                        "incorrect": section["incorrect"],
                        "unanswered": section["unanswered"],
                    },
                )
        return {
            "attempt_id": str(attempt_uuid),
            "status": terminal_status,
            "submission_reason": reason,
            "submitted_at": submitted_at,
        }
