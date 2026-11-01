from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.domain.pyq_validation import validate_mode, validate_publish
from app.schemas.pyq import PYQModeRequest, PYQPaperMetadata, PYQQuestionMapping


def _paper(**overrides):
    values = {
        "examination_code": "NIMCET",
        "year": 2024,
        "original_title": "NIMCET 2024 Question Paper",
        "duration_seconds": 7200,
        "source_url": "https://official.example.test/paper.pdf",
        "source_verification": "verified",
        "answer_key_verification": "verified",
        "state": "draft",
    }
    values.update(overrides)
    return PYQPaperMetadata(**values)


def _mapping(position=1, **overrides):
    values = {
        "question_id": "legacy-id-type-not-yet-verified",
        "original_section": "Mathematics",
        "original_position": position,
        "marks": Decimal("12"),
        "negative_marks": Decimal("3"),
        "verification": "verified",
    }
    values.update(overrides)
    return PYQQuestionMapping(**values)


def test_verified_source_and_ordered_central_question_mappings_are_publishable():
    assert validate_publish(_paper(), [_mapping(1), _mapping(2)]) == []


def test_publish_blocks_missing_provenance_and_unverified_source_or_mapping():
    paper = _paper(
        source_url=None,
        source_verification="unverified",
        source_citation=None,
    )
    issues = validate_publish(paper, [_mapping(verification="needs_review")])
    assert issues == ["source_provenance_required", "source_not_verified", "mapping_not_verified"]


def test_publish_rejects_duplicate_original_position_within_a_section():
    issues = validate_publish(_paper(), [_mapping(3), _mapping(3)])
    assert issues == ["duplicate_section_position"]


def test_same_position_in_different_original_sections_is_valid():
    assert validate_publish(
        _paper(),
        [_mapping(1, original_section="Mathematics"), _mapping(1, original_section="English")],
    ) == []


def test_invalid_marks_or_blank_identity_fields_are_rejected():
    with pytest.raises(ValidationError):
        _mapping(marks=Decimal("-1"))
    with pytest.raises(ValidationError):
        _mapping(question_id="   ")
    with pytest.raises(ValidationError):
        _paper(examination_code="   ")


def test_official_simulation_requires_verified_source_answer_mapping_duration_and_original_order():
    paper = _paper(state="published")
    questions = [_mapping(1)]
    good = PYQModeRequest(mode="official_simulation", scored=True)
    assert validate_mode(paper, questions, good) == []

    shuffled = PYQModeRequest(mode="official_simulation", shuffle_questions=True)
    issues = validate_mode(paper, questions, shuffled)
    assert issues == ["official_order_must_be_preserved"]


def test_official_simulation_blocks_missing_duration_or_unverified_answer_key():
    paper = _paper(state="published", duration_seconds=None, answer_key_verification="unverified")
    issues = validate_mode(paper, [_mapping()], PYQModeRequest(mode="official_simulation"))
    assert issues == ["official_duration_missing", "answer_key_not_verified"]


def test_practice_may_be_unscored_while_answer_key_is_unverified():
    paper = _paper(state="published", answer_key_verification="needs_review")
    assert validate_mode(
        paper,
        [_mapping()],
        PYQModeRequest(mode="practice", scored=False),
    ) == []
    assert validate_mode(
        paper,
        [_mapping()],
        PYQModeRequest(mode="practice", scored=True),
    ) == ["unverified_answer_key_cannot_be_scored"]


def test_no_published_or_unverified_papers_can_enter_a_mode():
    paper = _paper(state="draft")
    issues = validate_mode(paper, [_mapping(verification="needs_review")], PYQModeRequest(mode="practice"))
    assert issues == ["paper_not_published", "mapping_not_verified"]
