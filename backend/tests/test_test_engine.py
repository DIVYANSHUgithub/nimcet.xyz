from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.domain.test_engine import (
    QuestionSnapshot,
    TestEngineConflict,
    TestEngineForbidden,
    ensure_test_eligible,
    evaluate_attempt,
    idempotent_submission,
    next_answer_version,
    remaining_seconds,
    session_projection,
    submission_reason,
    validate_answer_write,
    validate_navigation,
)
from app.schemas.tests import CreateTestVersion, TestSectionDraft, TestQuestionDraft


NOW = datetime(2026, 11, 1, 12, 0, tzinfo=UTC)


def _question(**overrides):
    values = {
        "attempt_question_id": "attempt-q-1",
        "question_id": 23,
        "section_id": "section-1",
        "section_title": "Mathematics",
        "display_order": 0,
        "question": "What is 2 + 2?",
        "options": ("3", "4", "5", "6"),
        "correct_option": 1,
        "marks": Decimal("4"),
        "negative_marks": Decimal("1"),
        "option_order": (2, 0, 3, 1),
    }
    values.update(overrides)
    return QuestionSnapshot(**values)


def test_test_eligibility_enforces_publication_visibility_window_and_limits():
    ensure_test_eligible(
        version_status="published",
        visibility="public",
        owner_id=None,
        user_id="student-a",
        available_from=NOW,
        available_until=NOW + timedelta(hours=1),
        now=NOW,
        attempts_used=0,
        attempt_limit=1,
    )
    with pytest.raises(TestEngineForbidden, match="test_unavailable"):
        ensure_test_eligible(
            version_status="draft",
            visibility="public",
            owner_id=None,
            user_id="student-a",
            available_from=None,
            available_until=None,
            now=NOW,
            attempts_used=0,
            attempt_limit=1,
        )
    with pytest.raises(TestEngineForbidden, match="test_unavailable"):
        ensure_test_eligible(
            version_status="published",
            visibility="private",
            owner_id="student-b",
            user_id="student-a",
            available_from=None,
            available_until=None,
            now=NOW,
            attempts_used=0,
            attempt_limit=1,
        )
    with pytest.raises(TestEngineForbidden, match="attempt_limit_reached"):
        ensure_test_eligible(
            version_status="published",
            visibility="public",
            owner_id=None,
            user_id="student-a",
            available_from=None,
            available_until=None,
            now=NOW,
            attempts_used=1,
            attempt_limit=1,
        )


def test_active_attempt_conflicts_and_schedule_boundaries_are_closed():
    with pytest.raises(TestEngineConflict, match="active_attempt_exists"):
        ensure_test_eligible(
            version_status="published",
            visibility="public",
            owner_id=None,
            user_id="student-a",
            available_from=None,
            available_until=None,
            now=NOW,
            attempts_used=0,
            attempt_limit=3,
            active_attempt_id="existing",
        )
    with pytest.raises(TestEngineForbidden, match="test_closed"):
        ensure_test_eligible(
            version_status="published",
            visibility="public",
            owner_id=None,
            user_id="student-a",
            available_from=None,
            available_until=NOW,
            now=NOW,
            attempts_used=0,
            attempt_limit=1,
        )


def test_remaining_time_is_server_owned_and_never_negative():
    assert remaining_seconds(deadline_at=NOW + timedelta(seconds=4.9), server_time=NOW) == 4
    assert remaining_seconds(deadline_at=NOW - timedelta(seconds=1), server_time=NOW) == 0


def test_session_projection_freezes_order_and_omits_answer_key_fields():
    question = _question()
    session = session_projection(
        attempt={
            "attempt_id": "attempt-1",
            "test_id": "test-1",
            "test_version_id": "version-1",
            "status": "in_progress",
            "started_at": NOW,
            "deadline_at": NOW + timedelta(minutes=30),
        },
        questions=[question],
        answers={"attempt-q-1": {"selected_option_id": "option-3", "version": 2}},
        navigation={"attempt-q-1": {"visited": True, "marked_for_review": True}},
        server_time=NOW,
    )
    projected = session["questions"][0]
    assert [option["id"] for option in projected["options"]] == ["option-2", "option-0", "option-3", "option-1"]
    assert projected["answer"]["version"] == 2
    assert projected["state"] == {"visited": True, "marked_for_review": True}
    assert "correct_option" not in projected
    assert "explanation" not in projected
    assert session["remaining_seconds"] == 1800
    with pytest.raises(ValueError, match="invalid_persisted_option_order"):
        session_projection(
            attempt={
                "attempt_id": "attempt-1",
                "test_id": "test-1",
                "test_version_id": "version-1",
                "status": "in_progress",
                "started_at": NOW,
                "deadline_at": NOW,
            },
            questions=[_question(option_order=(0, 0, 1, 2))],
            answers={},
            navigation={},
            server_time=NOW,
        )


def test_answer_write_rejects_wrong_owner_state_deadline_and_option():
    validate_answer_write(
        status="in_progress",
        deadline_at=NOW + timedelta(seconds=1),
        now=NOW,
        option_ids={"option-0", "option-1"},
        selected_option_id="option-1",
    )
    with pytest.raises(TestEngineConflict, match="deadline_passed"):
        validate_answer_write(
            status="in_progress",
            deadline_at=NOW,
            now=NOW,
            option_ids={"option-0"},
            selected_option_id="option-0",
        )
    with pytest.raises(ValueError, match="invalid_option"):
        validate_answer_write(
            status="in_progress",
            deadline_at=NOW + timedelta(minutes=1),
            now=NOW,
            option_ids={"option-0"},
            selected_option_id="option-3",
        )
    with pytest.raises(TestEngineConflict, match="attempt_not_active"):
        validate_answer_write(
            status="submitted",
            deadline_at=NOW + timedelta(minutes=1),
            now=NOW,
            option_ids={"option-0"},
            selected_option_id=None,
        )


def test_answer_versions_detect_concurrent_or_stale_writes():
    assert next_answer_version(current_version=0, expected_version=0) == 1
    assert next_answer_version(current_version=3, expected_version=3) == 4
    with pytest.raises(TestEngineConflict, match="answer_version_conflict"):
        next_answer_version(current_version=4, expected_version=3)


def test_navigation_rejects_question_from_another_attempt():
    assert validate_navigation(
        attempt_question_ids={"attempt-q-1"},
        current_attempt_question_id="attempt-q-1",
        marked_for_review=True,
    )["marked_for_review"]
    with pytest.raises(TestEngineForbidden, match="question_not_in_attempt"):
        validate_navigation(
            attempt_question_ids={"attempt-q-1"},
            current_attempt_question_id="attempt-q-other",
            marked_for_review=False,
        )


def test_submission_reason_is_chosen_by_server_clock():
    assert submission_reason(
        requested_reason="student_submitted",
        deadline_at=NOW + timedelta(seconds=1),
        now=NOW,
    ) == "student_submitted"
    assert submission_reason(
        requested_reason="student_submitted",
        deadline_at=NOW,
        now=NOW,
    ) == "timer_expired"
    with pytest.raises(ValueError, match="invalid_submission_reason"):
        submission_reason(requested_reason="timer_expired", deadline_at=NOW, now=NOW)


def test_evaluation_uses_snapshotted_key_and_marks_with_negative_marks():
    q1 = _question()
    q2 = _question(
        attempt_question_id="attempt-q-2",
        section_id="section-2",
        section_title="English",
        display_order=1,
        correct_option=0,
        marks=Decimal("2"),
        negative_marks=Decimal("0.5"),
    )
    result = evaluate_attempt(
        questions=[q1, q2],
        answers={"attempt-q-1": "option-1", "attempt-q-2": "option-3"},
    )
    assert result["score"] == Decimal("3.5")
    assert result["maximum_score"] == Decimal("6")
    assert (result["correct"], result["incorrect"], result["unanswered"]) == (1, 1, 0)
    assert [section["section_id"] for section in result["sections"]] == ["section-1", "section-2"]


def test_idempotent_submission_replays_stored_terminal_result():
    stored = {"attempt_id": "attempt-1", "score": Decimal("4")}
    assert idempotent_submission(status="submitted", stored_result=stored) is stored
    assert idempotent_submission(status="in_progress", stored_result=None) is None
    with pytest.raises(RuntimeError, match="terminal_attempt_missing_submission"):
        idempotent_submission(status="expired", stored_result=None)


def test_test_version_configuration_rejects_duplicate_questions_and_bad_schedule():
    section = TestSectionDraft(
        code="math",
        title="Mathematics",
        display_order=0,
        questions=[
            TestQuestionDraft(question_id=1, display_order=0, marks=Decimal("4")),
            TestQuestionDraft(question_id=2, display_order=1, marks=Decimal("4")),
        ],
    )
    valid = CreateTestVersion(duration_seconds=3600, sections=[section])
    assert valid.attempt_limit == 1
    with pytest.raises(ValueError, match="Question IDs must be unique across"):
        CreateTestVersion(
            duration_seconds=3600,
            sections=[
                section,
                TestSectionDraft(
                    code="english",
                    title="English",
                    display_order=1,
                    questions=[TestQuestionDraft(question_id=1, display_order=0, marks=Decimal("2"))],
                ),
            ],
        )
