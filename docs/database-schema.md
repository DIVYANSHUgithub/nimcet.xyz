# Proposed Database Schema

**Phase:** Phase 1 design, updated with the Phase 3 catalog review.  
**Compatibility status:** selected live `questions` facts are verified; the rest of this schema remains a target proposal. See `supabase-live-schema-audit-results.md` for verified and pending items.

## Design principles

1. `public.questions` remains the canonical question entity. Do not create separate PYQ, mock-test, or subject question tables.
2. Existing question columns and meanings remain intact during the compatibility period. In particular, preserve the current `correct_option` representation until its live values and semantics are verified.
3. New question and test revisions are immutable once published, so old attempts remain reproducible after editorial changes.
4. `auth.users` remains the identity source. Application profiles and role assignments reference the verified Auth user UUID; never copy passwords or create a competing account store.
5. All FK types that reference the legacy question ID must match its actual live SQL type. The README schema description does not reveal that type.
6. UUIDs are proposed for new independent entities. Existing question IDs are not converted merely for consistency.
7. Use UTC `timestamptz`, explicit status values, FK/index/check/unique constraints, and transactions for state changes.
8. Every FK used for joins/filtering receives an index unless a composite index already covers its leading columns.

## Existing table: compatibility boundary

The checkout README documents `questions` columns `id`, `exam`, `exam_year`, `section`, `question_number`, `question`, `options`, `correct_option`, `explanation`, `subject`, `topic`, `difficulty`, `source`, `status`, and `created_at`. The live audit verifies 15 columns, JSONB `options`, nullable integer `correct_option`, text `status`, the listed constraint/index categories, and the question distributions. Exact column names/types/defaults and exact constraint expressions beyond those reported remain pending; see `supabase-live-schema-audit-results.md`.

The earlier API audit observed values compatible with zero-based `correct_option` indexing, while the live catalog summary verifies only its nullable integer type and the existence of a check constraint. Preserve the field and its current meaning until the exact check and row semantics are reconciled. The current frontend reads `select('*')`, so tests must never reuse that response projection.

### Proposed bridge, only after confirmation

- Add a nullable `current_revision_id` or equivalent only if a circular-FK-free migration sequence is practical; a separate mapping table is safer for the first rollout.
- Create a `question_revisions` row per published content revision and a deterministic mapping from each legacy option position to a stable option ID.
- Preserve legacy columns during backfill and during at least one rollback/monitoring window.
- Populate correct-option mapping only after each source row is validated. Invalid/missing/out-of-range answers go to an explicit review report and remain unpublished for test use; do not infer an answer.
- Do not drop legacy columns in this product phase without a separate compatibility review.

## Proposed entities

### Examination catalog

| Entity | Important columns and rules |
| --- | --- |
| `examinations` | `id uuid PK`, `code text UNIQUE NOT NULL` (e.g. `NIMCET`), `name`, `status`, timestamps. `code` is stable API/config key. |
| `sections` | `id uuid PK`, `examination_id FK`, `code`, `name`, `display_order`, `status`; unique `(examination_id, code)`. A section is an examination-level component, not an academic subject or a section inside a particular test version. |
| `subjects` | `id uuid PK`, `examination_id FK`, `code`, `name`, `display_order`, `status`; unique `(examination_id, code)`. |
| `chapters` | `id uuid PK`, `subject_id FK`, `code`, `name`, `display_order`, `status`; unique `(subject_id, code)`. |
| `topics` | `id uuid PK`, `chapter_id FK`, `code`, `name`, `display_order`, `status`; unique `(chapter_id, code)`. |
| `question_taxonomy` | `question_id` FK to the verified legacy type, `topic_id FK`, optional source section label; composite PK `(question_id, topic_id)`. Supports multiple topics without duplicating question text. |

#### Section and subject distinction

An examination owns both its exam sections and its academic subjects. These are separate catalog dimensions: an exam section describes the paper structure, while a subject is the academic classification that contains chapters and topics. The audit observed the same four labels in `questions.section` and `questions.subject`; the verified section counts are Mathematics 50, Analytical Ability & Logical Reasoning 22, Computer Awareness 20, and General English 10. Matching current labels do not prove the concepts are interchangeable or that future exams have a one-to-one mapping.

Keep `sections` and `subjects` independently linked to `examinations`; do not impose a section-to-subject FK or one-to-one mapping until an official exam blueprint establishes that relationship. `chapters` and `topics` remain under subjects. A future legacy bridge maps the existing `questions.section` string to the exam-section catalog and the subject/topic strings to the academic taxonomy separately. The question FK type and mapping remain pending; no existing question field is changed by the catalog migration. `test_sections` are a separate per-test-version construct.

Legacy string columns remain query-compatible during rollout. Add structured taxonomy references only after taxonomy values are reconciled; do not auto-create duplicate taxonomy labels from inconsistent casing/spacing.

#### Status and availability semantics

`active` means an item is available for future catalog selection; `inactive` means it is retained but unavailable for new student-facing selection. Deactivation is not deletion. An item is effectively available only when it and every ancestor are active: an active subject under an inactive examination is unavailable; an active chapter under an inactive subject/examination is unavailable; an active topic under an inactive chapter/subject/examination is unavailable. An inactive exam section also makes content mapped to that section unavailable. Student-facing repositories must join the full ancestry and apply these status checks; filtering only the leaf row is insufficient. Admin/audit views may inspect inactive entries under separately authorized access.

#### Timestamp ownership

PostgreSQL defaults initialize `created_at` and `updated_at` on insert. FastAPI owns later `updated_at` changes and must set `updated_at` explicitly in the same SQL `UPDATE` as every catalog mutation. No timestamp trigger is installed. This keeps write behavior visible in repository code and avoids hidden trigger side effects; repository tests must assert each update supplies a new timestamp, while the isolated migration smoke test checks defaults and confirms no user trigger silently changes timestamps.

### Question revisions and media

| Entity | Important columns and rules |
| --- | --- |
| `question_revisions` | `id uuid PK`, `question_id` FK using exact legacy ID type, `revision_number int`, `content jsonb`, `correct_option_id text NULL`, `explanation_content jsonb NULL`, `difficulty`, `publication_state`, `created_by uuid FK auth.users`, `created_at`; unique `(question_id, revision_number)`. Published revisions are immutable. |
| `media_assets` | `id uuid PK`, `bucket text`, `object_path text`, `mime_type text`, `byte_size bigint`, `sha256 text NULL`, `visibility`, `state`, `uploaded_by uuid FK auth.users`, timestamps; unique `(bucket, object_path)`, check `byte_size > 0` and allowlisted state/visibility. |
| `question_revision_assets` | `question_revision_id FK`, `asset_id FK`, optional `option_id text`, role and display order; composite uniqueness prevents duplicate association. Allows safe orphan checks and ownership validation. |

The JSON content contract is specified in `architecture.md`. The database stores stable asset references/IDs in content, never expiring signed URLs. `correct_option_id` references a stable option ID in that same revision's options; validation must ensure it exists. A later migration may add database-level JSON validation if it is maintainable and compatible with the deployed PostgreSQL version.

### Trusted identities and roles

| Entity | Important columns and rules |
| --- | --- |
| `user_profiles` | `user_id uuid PK FK auth.users(id) ON DELETE CASCADE`, display name, username nullable, account state, privacy settings, timestamps. Unique normalized username only if product rules require it and existing metadata is reconciled. |
| `roles` | `id smallint or uuid PK`, `code UNIQUE` constrained to `student`, `editor`, `administrator`, `super_administrator`. Whether all users receive explicit `student` rows is an implementation choice. |
| `user_roles` | `user_id FK auth.users`, `role_id FK roles`, `granted_by FK auth.users NULL`, `granted_at`, `revoked_at NULL`; unique active assignment and audit linkage. Role grants are server-controlled. |
| `student_preferences` | `user_id PK FK auth.users`, opted-in leaderboard flag, UI preferences JSON with schema validation, timestamps. No sensitive fields in public ranking responses. |

Direct FK reference to `auth.users` must be verified as appropriate for the project. Profile deletion and Auth account deletion need a documented retention policy before cascading personal learning records.

### Test authoring and immutable versions

| Entity | Important columns and rules |
| --- | --- |
| `tests` | `id uuid PK`, `examination_id FK`, `code`/slug optional, `title`, `kind` (`full_length`, `section`, `subject`, `custom`, `pyq`, `daily`), `visibility`, `owner_id FK auth.users NULL`, `lifecycle_state`, `created_by`, timestamps. Private student tests require non-null owner. |
| `test_versions` | `id uuid PK`, `test_id FK`, `version_number int`, `duration_seconds`, `attempt_limit`, `available_from/to timestamptz NULL`, `marking_config jsonb`, `review_policy jsonb`, `shuffle_questions bool`, `shuffle_options bool`, `status`, `published_at`; unique `(test_id, version_number)` and positive duration/attempt checks. Immutable after publication. |
| `test_sections` | `id uuid PK`, `test_version_id FK`, `code`, `title`, `display_order`, optional section duration, `default_marks numeric`, `default_negative_marks numeric`; unique `(test_version_id, code)` and `(test_version_id, display_order)`. |
| `test_questions` | Target design: `id uuid PK`, `test_section_id FK`, `question_revision_id FK`, `display_order`, marks overrides, and required flag. The Phase 8 local migration is an interim compatibility draft because question revisions do not exist yet: it references verified `public.questions(id bigint)` and snapshots the legacy prompt/options/key into each test version. Reconcile the two before production approval. |
| `pyq_papers` | `id uuid PK`, `test_id FK UNIQUE`, `examination_id FK`, `year smallint`, `original_title`, original duration/source URL or citation, verification state, verification notes, `created_by`, timestamps. |
| `pyq_paper_versions` | `id uuid PK`, `pyq_paper_id FK`, `test_version_id FK UNIQUE`, source/verification metadata snapshot, original instructions JSONB. Official question and section ordering comes from the linked immutable test version. |

`test_versions.marking_config` and per-question overrides are explicit data, not NIMCET constants. A publish validator requires a marking rule for every test question after defaults and overrides are resolved. Official PYQ simulation sets shuffling off and preserves source order; practice behavior is a distinct configuration.

### Attempts, answers, and results

| Entity | Important columns and rules |
| --- | --- |
| `test_attempts` | `id uuid PK`, `test_version_id FK`, `user_id FK auth.users`, `attempt_number`, `status` (`in_progress`, `submitted`, `expired`, `terminated`), `started_at`, `deadline_at`, `submitted_at NULL`, `submission_reason NULL`, `current_section_id NULL`, `current_attempt_question_id NULL`, timestamps; unique `(test_version_id, user_id, attempt_number)`. Index `(user_id, started_at DESC)` and active-attempt lookup. |
| `attempt_questions` | `id uuid PK`, `attempt_id FK`, `test_question_id FK`, `display_order`, `option_order jsonb` containing option IDs, visited/review state, `first_seen_at`, `last_seen_at`; unique `(attempt_id, test_question_id)` and `(attempt_id, display_order)`. This freezes the session's question/option presentation. |
| `attempt_answers` | `attempt_question_id uuid PK/FK`, `selected_option_id text NULL`, `response jsonb NULL` for supported non-MCQ types, `version bigint NOT NULL`, `saved_at`, `updated_at`; check only one response form is populated according to question type. Answer saves update with expected version. |
| `attempt_submissions` | `attempt_id uuid PK/FK`, `reason`, `submitted_at`, `request_idempotency_key text NULL`, `evaluated_at`, `evaluation_version`; primary key enforces at most one final submission/evaluation record per attempt. |
| `test_results` | `attempt_id uuid PK/FK`, `score numeric`, `maximum_score numeric`, correct/incorrect/unanswered counts, time spent, `released_at NULL`, `created_at`; values generated by trusted evaluator only. |
| `section_results` | `id uuid PK`, `attempt_id FK`, `test_section_id FK`, score/max, correct/incorrect/unanswered, time spent; unique `(attempt_id, test_section_id)`. |

Attempt answer history is not a separate append-only table initially: `version`, timestamps, and audit-safe attempt events are enough for reliable current-state autosave. Add an answer revision log only if a concrete review/recovery requirement justifies the extra storage and privacy burden.

### Student question features and audit

| Entity | Important columns and rules |
| --- | --- |
| `bookmarks` | `user_id FK auth.users`, `question_id FK` using exact legacy type, `created_at`; composite PK prevents duplicate bookmarks. |
| `bookmark_collections` | `id uuid PK`, `owner_id FK auth.users`, `name`, timestamps; unique normalized `(owner_id, name)`. |
| `bookmark_collection_questions` | `collection_id FK`, `question_id FK`, `created_at`; composite PK. Ownership checked by service and RLS. |
| `question_reports` | `id uuid PK`, `question_id FK`, `reporter_id FK auth.users`, category, description, status (`open`, `in_review`, `resolved`, `dismissed`), assignee, resolution, timestamps; index on `(status, created_at)`. |
| `admin_audit_log` | `id uuid PK`, actor ID, action code, entity type/id, request ID, timestamp, safe JSON before/after diff, reason. No credentials, tokens, passwords, or private answer bodies. Append-only to application roles. |

Attempted/correct/incorrect question analytics should initially be derived from evaluated attempt data, not denormalized counters. Add aggregates only after query plans show a need and define freshness semantics.

## Indexes, constraints, and transaction rules

- Unique: examination code; scoped catalog codes; question revision number; test version number; section/test ordering; active role assignment; bookmark; collection membership; attempt number; attempt question order; one submission/result per attempt.
- Checks: duration and attempt limits positive; question order non-negative; marks/max scores finite and valid; `deadline_at > started_at`; only allowed lifecycle/submission/review values; media size/MIME/state allowlists at application and database layers where feasible.
- Index FKs for every parent-child query and ownership filter. Add query indexes for published question search only after live data volume and PostgreSQL capabilities are known; use full text/trigram indexes only when justified by measured search plans.
- Publish transaction: validate test and question revisions, create immutable test version and mappings, audit, and update published pointer in one transaction.
- Attempt start transaction: lock or atomically count active/previous attempts, enforce limits, create attempt and presentation snapshot, and return persisted server timestamps.
- Answer save transaction: verify owner/status/deadline, compare answer version, upsert response, increment version, and update navigation state.
- Submission transaction: lock attempt row, return existing terminal result on duplicate, transition status, evaluate stored answer rows against pinned revisions and marking config, insert submission/result/section results, and commit atomically.
- Media deletion transaction cannot atomically cover Storage. Mark pending deletion, verify no references, remove object through Storage API, then mark deleted; retry safely on failure.

## RLS policy design (must be validated on the actual project)

- Public/anon: read only published practice question projections if that is a deliberate product decision. Never expose active exam answer keys through a public policy or view.
- Student: row access restricted to their `user_id`/`owner_id`; test sessions and answer mutation require ownership plus active status/deadline checks implemented in the backend.
- Editor/admin: no trust in frontend route hiding; backend verifies role. RLS should grant only what the server connection model supports and should not grant role changes to ordinary authenticated users.
- Privileged backend: use a dedicated role and narrowly scoped grants. If a privileged server connection bypasses RLS, document it as a separate security boundary and add integration checks for every ownership-sensitive operation.
- Storage: upload/delete only through backend-authorized paths or policies tied to verified actor and object prefix; clients cannot choose arbitrary object path prefixes.

RLS SQL is intentionally not supplied before current policies and connection mode are known. Replacing unknown live policies wholesale would be unsafe.

## Migration/backfill plan and verification

1. Snapshot live DDL, policies, indexes, row counts, and sanitized sample rows. Confirm the database target is non-production.
2. Reconcile README claims to the actual `questions` table, especially primary key type, option JSON shape, status values, correct-option base, and any duplicate IDs/data anomalies.
3. Create the migration baseline without taking ownership of or dropping existing objects. Name and document any pre-existing schema objects adopted by Alembic.
4. Add catalog, profile/roles, content revision, and media metadata tables in small reversible migrations. Avoid new required columns on existing rows.
5. Backfill question revisions by stable batches with a checkpoint table/log. For each row, validate all options and the answer index; record success/failure and source ID. A failed row remains preserved and is flagged for review.
6. Compare legacy/new question counts, IDs, prompt hashes, option order, answer mappings, publication status, and representative rendered content. Require zero unexplained loss or identity changes before switching reads.
7. Add test/PYQ, attempts/results, and bookmark/report tables after question revisions are available.
8. Apply RLS policies additively and test anon, student A, student B, editor, admin, and backend roles in an isolated project.
9. Rollback before client cutover drops only newly created empty or safely reversible objects. After writes begin, rollback means app rollback plus forward-compatible data handling; never delete user-generated records to force rollback.

### Required pre-migration facts

- Exact columns and SQL types for `questions`, including primary key, nullability, defaults, constraints, indexes, and row count.
- Actual `options` examples and `correct_option` examples, including malformed/edge rows.
- Existing `status` values and interpretation of published/unpublished content.
- All public tables, views, functions, triggers, grants, and RLS policies relevant to questions and Auth.
- Auth provider/redirect settings and whether profiles/role metadata exist outside the repository.
- Storage bucket inventory, object counts, visibility, size/MIME policies, and object naming patterns.
- Supabase PostgreSQL version and deployed connection/pooling mode.

Until these facts are captured, this document supports architecture review only; it is not permission to apply DDL.
