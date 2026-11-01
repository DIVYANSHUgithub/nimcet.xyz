from collections import Counter

from app.schemas.pyq import PYQModeRequest, PYQPaperMetadata, PYQQuestionMapping


def validate_publish(
    paper: PYQPaperMetadata,
    questions: list[PYQQuestionMapping],
) -> list[str]:
    """Return publication blockers without inferring missing source or answer data."""
    issues: list[str] = []
    if paper.state != "draft":
        issues.append("paper_must_be_draft")
    if paper.source_url is None and paper.source_citation is None:
        issues.append("source_provenance_required")
    if paper.source_verification != "verified":
        issues.append("source_not_verified")
    if not questions:
        issues.append("question_mapping_required")

    positions = Counter((q.original_section.casefold(), q.original_position) for q in questions)
    if any(count > 1 for count in positions.values()):
        issues.append("duplicate_section_position")
    if any(q.verification != "verified" for q in questions):
        issues.append("mapping_not_verified")
    return issues


def validate_mode(
    paper: PYQPaperMetadata,
    questions: list[PYQQuestionMapping],
    request: PYQModeRequest,
) -> list[str]:
    """Validate official and practice settings independently from presentation code."""
    issues: list[str] = []
    if paper.state != "published":
        issues.append("paper_not_published")
    if paper.source_verification != "verified":
        issues.append("source_not_verified")
    if not questions or any(q.verification != "verified" for q in questions):
        issues.append("mapping_not_verified")

    if request.mode == "official_simulation":
        if paper.duration_seconds is None:
            issues.append("official_duration_missing")
        if paper.answer_key_verification != "verified":
            issues.append("answer_key_not_verified")
        if request.shuffle_questions or request.shuffle_options:
            issues.append("official_order_must_be_preserved")
        if not request.scored:
            issues.append("official_simulation_requires_scoring")
    elif request.scored and paper.answer_key_verification != "verified":
        issues.append("unverified_answer_key_cannot_be_scored")
    return issues
