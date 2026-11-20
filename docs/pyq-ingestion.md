# PYQ source and ingestion contract

## 2026 production release

The 2026 paper uses the existing 120 questions. `backend/scripts/stage_nimcet_2026.py` takes the reviewed answer-key mapping and the matching question snapshot, stages the paper and taxonomy in Supabase, and leaves the test as a draft. It checks that the uploaded option ordering still matches the reviewed snapshot and applies the [official 2026 challenge decisions](https://cdnbbsr.s3waas.gov.in/s33e6260b81898beacda3d16db379ed329/uploads/2026/06/202606181590062828.pdf) to the test snapshots.

Publish only after the API and student frontend that support timed sections and alternative correct answers are running. Enable `QUESTION_AUTHORING_ENABLED`, `TEST_ENGINE_ENABLED`, `PHASE5_ENABLED`, `ADMIN_WORKFLOWS_ENABLED`, and `TRUSTED_ROLE_LOOKUP_ENABLED` for the admin workflow, then run `backend/scripts/check_deployment.py` as a read-only production preflight. Browser clients use the API for PYQ tests and attempt ownership checks.

## Local validation foundation

`backend/app/schemas/pyq.py` defines draft paper metadata and a mapping from an original section/order position to a central question ID. It does not copy question stems or answer keys. `question_id` is kept as a bounded string until the production SQL type and revision identity are verified.

`backend/app/domain/pyq_validation.py` blocks publication when source provenance is missing/unverified, original positions are duplicated within a section, or mappings need review. It validates official-simulation settings separately: the paper must be published, its source/mappings/answer key must be verified, duration must be known, scoring must be enabled, and original question/option order must be preserved. Practice can be unscored while answer-key verification is pending; an unverified key cannot be scored.

## Local workflow

With the existing migrations applied to a local database, set `QUESTION_AUTHORING_ENABLED=true`, `TEST_ENGINE_ENABLED=true`, and `PHASE5_ENABLED=true` on the local API. For version review in the admin app, also enable `ADMIN_WORKFLOWS_ENABLED` and `TRUSTED_ROLE_LOOKUP_ENABLED` with local role assignments. Point the frontend apps at the local API and local Auth instance.

1. In **Questions & catalog**, classify the question and add a PYQ occurrence with its exam, year, original section, original position, and source. The authoring fields **Topic** and **Subtopic** correspond to **Chapter** and **Topic** on the student PYQ page. Publish the question to make it available for practice under **All PYQ questions**.
2. In **Test authoring**, create a test with category **pyq**, add the published questions in original paper order, set the section marks and timing, and submit the version for review. Use the recorded paper year in the question picker to narrow the list during assembly.
3. After version approval, open **PYQ verification**, enter the paper source and original section blueprint, and verify the answer key. **Validate and approve paper** saves the verification. **Publish PYQ test** releases it to the public catalog.

Visitors can browse the paper list while signed out. Starting and resuming a timed attempt uses the student's signed-in account, which also owns the result and review. The **PYQ tests** view shows **PYQ test not published** when the catalog is empty.

## Required source review before ingesting a paper

For each paper, capture the original publisher/organizer, exact source URL or stable citation, retrieval date, original title/year, duration, instructions, section ordering, and answer-key source. A reviewer must compare every mapping with the original source, preserve section labels and question order, and mark source and answer-key verification separately. Retain unresolved/ambiguous items as `needs_review`; never infer missing questions, answer positions, marks, negative marks, or duration from the current question-bank distribution.

Before database/API implementation, verify the legacy question ID and question-revision identity, complete migration history, Auth and role setup, and a disposable PostgreSQL 17 environment. Persisted mappings must reference the canonical question/revision with FK types that match verified schema. Published paper versions should be immutable; practice and official simulation must remain separate modes.
