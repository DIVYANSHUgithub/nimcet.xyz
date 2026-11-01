from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any


class TestEngineConflict(Exception):
    __test__ = False

    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


class TestEngineForbidden(Exception):
    __test__ = False

    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


@dataclass(frozen=True)
class QuestionSnapshot:
    attempt_question_id: str
    question_id: int
    section_id: str
    section_title: str
    display_order: int
    question: str
    options: tuple[Any, ...]
    correct_option: int
    marks: Decimal
    negative_marks: Decimal
    option_order: tuple[int, ...]


def ensure_test_eligible(
    *,
    version_status: str,
    visibility: str,
    owner_id: str | None,
    user_id: str,
    available_from: datetime | None,
    available_until: datetime | None,
    now: datetime,
    attempts_used: int,
    attempt_limit: int,
    active_attempt_id: str | None = None,
) -> None:
    if version_status != "published":
        raise TestEngineForbidden("test_unavailable")
    if visibility == "private" and owner_id != user_id:
        raise TestEngineForbidden("test_unavailable")
    if available_from is not None and now < available_from:
        raise TestEngineForbidden("test_not_started")
    if available_until is not None and now >= available_until:
        raise TestEngineForbidden("test_closed")
    if active_attempt_id is not None:
        raise TestEngineConflict("active_attempt_exists")
    if attempts_used >= attempt_limit:
        raise TestEngineForbidden("attempt_limit_reached")


def remaining_seconds(*, deadline_at: datetime, server_time: datetime) -> int:
    return max(0, int((deadline_at - server_time).total_seconds()))


def session_projection(
    *,
    attempt: dict[str, Any],
    questions: list[QuestionSnapshot],
    answers: dict[str, dict[str, Any]],
    navigation: dict[str, dict[str, Any]],
    server_time: datetime,
) -> dict[str, Any]:
    projected = []
    for question in sorted(questions, key=lambda item: item.display_order):
        answer = answers.get(question.attempt_question_id, {})
        state = navigation.get(question.attempt_question_id, {})
        option_ids = [f"option-{index}" for index in range(len(question.options))]
        if sorted(question.option_order) != list(range(len(question.options))):
            raise ValueError("invalid_persisted_option_order")
        projected.append(
            {
                "attempt_question_id": question.attempt_question_id,
                "question_id": question.question_id,
                "section_id": question.section_id,
                "section_title": question.section_title,
                "display_order": question.display_order,
                "question": question.question,
                "options": [
                    {"id": option_ids[index], "content": question.options[index]}
                    for index in question.option_order
                ],
                "answer": {
                    "selected_option_id": answer.get("selected_option_id"),
                    "version": int(answer.get("version", 0)),
                    "saved_at": answer.get("saved_at"),
                },
                "state": {
                    "visited": bool(state.get("visited", False)),
                    "marked_for_review": bool(state.get("marked_for_review", False)),
                },
            }
        )

    return {
        "attempt_id": attempt["attempt_id"],
        "test_id": attempt["test_id"],
        "test_version_id": attempt["test_version_id"],
        "test_title": attempt.get("test_title", "Timed practice"),
        "status": attempt["status"],
        "started_at": attempt["started_at"],
        "deadline_at": attempt["deadline_at"],
        "server_time": server_time,
        "remaining_seconds": remaining_seconds(
            deadline_at=attempt["deadline_at"], server_time=server_time
        ),
        "questions": projected,
    }


def validate_answer_write(
    *,
    status: str,
    deadline_at: datetime,
    now: datetime,
    option_ids: set[str],
    selected_option_id: str | None,
) -> None:
    if status != "in_progress":
        raise TestEngineConflict("attempt_not_active")
    if now >= deadline_at:
        raise TestEngineConflict("deadline_passed")
    if selected_option_id is not None and selected_option_id not in option_ids:
        raise ValueError("invalid_option")


def next_answer_version(*, current_version: int, expected_version: int) -> int:
    if current_version != expected_version:
        raise TestEngineConflict("answer_version_conflict")
    return current_version + 1


def validate_navigation(
    *,
    attempt_question_ids: set[str],
    current_attempt_question_id: str,
    marked_for_review: bool,
) -> dict[str, Any]:
    if current_attempt_question_id not in attempt_question_ids:
        raise TestEngineForbidden("question_not_in_attempt")
    return {
        "current_attempt_question_id": current_attempt_question_id,
        "visited_attempt_question_id": current_attempt_question_id,
        "marked_for_review": marked_for_review,
    }


def submission_reason(*, requested_reason: str, deadline_at: datetime, now: datetime) -> str:
    if requested_reason != "student_submitted":
        raise ValueError("invalid_submission_reason")
    return "timer_expired" if now >= deadline_at else "student_submitted"


def evaluate_attempt(
    *,
    questions: list[QuestionSnapshot],
    answers: dict[str, str | None],
) -> dict[str, Any]:
    score = Decimal("0")
    maximum_score = Decimal("0")
    counts = {"correct": 0, "incorrect": 0, "unanswered": 0}
    sections: dict[str, dict[str, Any]] = {}
    for question in questions:
        section = sections.setdefault(
            question.section_id,
            {
                "section_id": question.section_id,
                "title": question.section_title,
                "score": Decimal("0"),
                "maximum_score": Decimal("0"),
                "correct": 0,
                "incorrect": 0,
                "unanswered": 0,
            },
        )
        maximum_score += question.marks
        section["maximum_score"] += question.marks
        selected = answers.get(question.attempt_question_id)
        if selected is None:
            counts["unanswered"] += 1
            section["unanswered"] += 1
            continue
        try:
            selected_index = int(selected.removeprefix("option-"))
        except (TypeError, ValueError):
            selected_index = -1
        if selected_index == question.correct_option:
            score += question.marks
            section["score"] += question.marks
            counts["correct"] += 1
            section["correct"] += 1
        else:
            score -= question.negative_marks
            section["score"] -= question.negative_marks
            counts["incorrect"] += 1
            section["incorrect"] += 1
    return {
        "score": score,
        "maximum_score": maximum_score,
        **counts,
        "sections": list(sections.values()),
    }


def idempotent_submission(*, status: str, stored_result: dict[str, Any] | None) -> dict[str, Any] | None:
    if status in {"submitted", "expired"}:
        if stored_result is None:
            raise RuntimeError("terminal_attempt_missing_submission")
        return stored_result
    if status != "in_progress":
        raise TestEngineConflict("attempt_not_submittable")
    return None
