# PYQ source and ingestion contract

## Verified repository state

- This checkout has no source-backed PYQ paper files, paper metadata records, central-question mappings, or answer-key verification records.
- The live audit reported published question rows for exam year 2026, but that alone does not prove that they form a complete prior-year paper or establish original paper order, duration, marks, source, or answer-key provenance. Do not auto-convert those rows into PYQ mappings.
- The official NIMCET archive currently lists a 2025 Challenges-handled Report and a 2024 “Modified Model Solution after Considering the Challenges.” Those are useful provenance artifacts, but the archive listing by itself does not verify a complete paper or a question-to-question mapping. See the [official NIMCET archive](https://nimcet.admissions.nic.in/archive/).

## Local validation foundation

`backend/app/schemas/pyq.py` defines draft paper metadata and a mapping from an original section/order position to a central question ID. It does not copy question stems or answer keys. `question_id` is kept as a bounded string until the production SQL type and revision identity are verified.

`backend/app/domain/pyq_validation.py` blocks publication when source provenance is missing/unverified, original positions are duplicated within a section, or mappings need review. It validates official-simulation settings separately: the paper must be published, its source/mappings/answer key must be verified, duration must be known, scoring must be enabled, and original question/option order must be preserved. Practice can be unscored while answer-key verification is pending; an unverified key cannot be scored.

These are validation contracts only. No PYQ database migration, API endpoint, imported paper, or frontend simulation was added in this slice.

## Required source review before ingesting a paper

For each paper, capture the original publisher/organizer, exact source URL or stable citation, retrieval date, original title/year, duration, instructions, section ordering, and answer-key source. A reviewer must compare every mapping with the original source, preserve section labels and question order, and mark source and answer-key verification separately. Retain unresolved/ambiguous items as `needs_review`; never infer missing questions, answer positions, marks, negative marks, or duration from the current question-bank distribution.

Before database/API implementation, verify the legacy question ID and question-revision identity, complete migration history, Auth and role setup, and a disposable PostgreSQL 17 environment. Persisted mappings must reference the canonical question/revision with FK types that match verified schema. Published paper versions should be immutable; practice and official simulation must remain separate modes.
