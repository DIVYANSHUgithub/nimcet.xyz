# API Contract (Proposed)

**Base path:** `/api/v1`  
**Status:** Phase 1 contract updated for Phase 4. `/health`, `/ready`, `/api/v1/auth/me`, and the read-only legacy question endpoints `/api/v1/questions`, `/api/v1/questions/facets`, and `/api/v1/questions/{question_id}` are implemented. Write, rich-revision, and media endpoints remain planned.

## Conventions

### Authentication

- Protected endpoints require `Authorization: Bearer <Supabase access token>`.
- FastAPI verifies token signature, issuer, audience, expiration, and subject using the configured project verification method. Roles come from trusted server state, never user-editable signup metadata.
- `student`, `editor`, `administrator`, and `super_administrator` identify policy capabilities; endpoint ownership constraints still apply.
- Anonymous access is limited to deliberately public published-content reads, subject to verified Supabase/RLS policy.

### Pagination and filtering

- Collection requests accept `limit` (default 20, maximum 100) and `cursor` where stable cursor pagination is available.
- Responses use `{ "items": [], "next_cursor": null }`; include `total` only when a caller needs it and the query cost is acceptable.
- Question filters are server-side: `examination`, `subject`, `section`, `chapter`, `topic`, `difficulty`, `year`, `type`, `search`, `sort`.
- List ordering has a stable unique tiebreaker. Ignore/abort stale frontend requests, but do not rely on client cancellation for server correctness.

The current legacy question endpoint uses `page` (default 1) and `page_size` (default 10, maximum 100), returning an exact `total` and clamping an out-of-range page to the final page. It supports the existing fields `exam`, `section`, `subject`, `topic`, `difficulty`, `year`, `type`, `search`, and `sort`; chapter filtering remains unavailable because the legacy table has no chapter column.

### Standard errors

```json
{
  "error": {
    "code": "answer_version_conflict",
    "message": "The answer changed after this copy was loaded.",
    "details": { "current_version": 4 },
    "request_id": "req_..."
  }
}
```

`details` is omitted when not useful. Do not return stack traces, SQL, secrets, answer keys, or protected explanations in errors. Statuses: `400` malformed operation, `401` invalid/missing token, `403` denied, `404` absent or intentionally concealed resource, `409` state/version conflict, `422` validation failure, `429` rate limited, `500` generic server failure.

### Idempotency and concurrency

- `POST /attempts/{id}/submit` is idempotent by attempt ID; repeats return the same terminal submission/result.
- Answer writes require `expected_version`; conflict is `409`, with no stale overwrite.
- Other retryable creates accept `Idempotency-Key` where duplicate creation would be harmful.
- Backend derives user/owner IDs from verified auth. A client-supplied owner ID is rejected or ignored.

## Auth and health

| Method and path | Auth / role | Contract and behavior |
| --- | --- | --- |
| `GET /health` | Public | Process liveness only; `{ "status": "ok" }`; no dependency or secret disclosure. |
| `GET /ready` | Internal/monitoring policy | Checks DB connectivity and required schema compatibility; returns generic readiness. Do not expose schema details. |
| `GET /auth/me` | Any authenticated role | Returns verified `user_id`, safe profile fields, and trusted role codes. Does not return token claims wholesale. |

## Question bank and catalog

| Method and path | Auth / role | Contract and behavior |
| --- | --- | --- |
| `GET /questions` | Anonymous or student; published only | Implemented read-only page over the existing legacy table. Returns the explicit legacy practice projection, including `correct_option` and `explanation` because existing published practice reads expose them. Filters and sort are parameterized; list order has an ID tiebreaker. |
| `GET /questions/facets` | Anonymous or student; published only | Implemented distinct published subject/topic labels for legacy filters. |
| `GET /questions/{question_id}` | Anonymous or student; published only | Implemented published question detail using an explicit legacy projection. Returns 404 for missing or unpublished IDs. |
| `POST /questions` | Editor+ | Creates draft question/revision; validates content, taxonomy, stable option IDs, and media ownership. Audit event in same transaction. |
| `PATCH /questions/{question_id}` | Editor+ scoped | Creates a new draft revision or edits unpublished draft. Does not mutate a revision pinned by a published test/attempt. |
| `POST /questions/{question_id}/approve` | Administrator+ | Approves specified revision with optimistic revision ID; records reviewer and audit event. |
| `POST /questions/{question_id}/publish` | Administrator+ | Publishes approved revision, validates answer mapping and content. Idempotent for already-published revision. |
| `POST /questions/{question_id}/archive` | Administrator+ | Removes from future browse/test selection while retaining existing references and attempts. No destructive delete by default. |
| `GET /examinations` | Public | Active exam definitions available to browse. |
| `GET /subjects` | Public | Filter by `examination_id`; active subject list. |
| `GET /topics` | Public | Filter by subject/chapter; paginated where needed. |

Question response includes `content: {version, prompt, options}` and metadata, with stable option IDs. `correct_option_id` is omitted from every endpoint used for an active test session. Content renderer uses the shared schema described in `architecture.md`.

## Media

| Method and path | Auth / role | Contract and behavior |
| --- | --- | --- |
| `POST /media/uploads` | Editor+ | Request metadata `{filename, content_type, byte_size, sha256?}`. Validates policy, generates object path, returns asset ID and either a short-lived upload URL or backend upload target. No caller-selected bucket/path. |
| `POST /media/{asset_id}/complete` | Editor+ owner/scope | Confirms uploaded object exists and matches size/type policy; transitions pending asset to ready. Idempotent. |
| `GET /media/{asset_id}/access` | Published content reader or authorized editor | Resolves public URL or short-lived signed URL at request time; does not persist signed URL. |
| `DELETE /media/{asset_id}` | Editor+ authorized | Rejects linked assets unless replacement/unlink is authorized; queues safe removal and audit. No arbitrary object deletion. |

File size and MIME allowlists are configuration, not frontend-only checks. Reject HTML and unsafe SVG unless a reviewed sanitizer is implemented.

## PYQs and tests

**PYQ status:** Validation schemas are implemented, but no PYQ routes, storage tables, or source-backed papers have been implemented. The endpoint rows below remain proposed contracts.

| Method and path | Auth / role | Contract and behavior |
| --- | --- | --- |
| `GET /pyqs` | Public | List published PYQ paper metadata; filters `examination`, `year`, section/subject where mapped. |
| `GET /pyqs/{paper_id}` | Public | Paper metadata, original instructions/order summary, verification status. No invented source or answer key. |
| `POST /admin/pyqs` | Administrator+ | Creates draft paper metadata referencing an existing test/test version; validates exam/year/source. |
| `PUT /admin/pyqs/{paper_id}/questions` | Administrator+ | Replaces draft mapping atomically with central question revisions, original section/order, marks, negative marks. Published versions are immutable. |
| `POST /admin/pyqs/{paper_id}/publish` | Administrator+ | Validates original order and paper metadata; publish action is audited. |
| `GET /tests` | Public/student | Lists eligible published public tests, respecting schedules, visibility, and user ownership for private tests. Never returns answer keys. |
| `POST /tests` | Student or administrator | Student creates private test; admin creates draft. Server validates count, filters, duration, and selected question eligibility. |
| `GET /tests/{test_id}` | Owner/admin or eligible student | Metadata and permitted configuration. Does not include answer keys. |
| `POST /admin/tests/{test_id}/versions` | Administrator+ | Builds new immutable draft version with sections/questions/marking/review policy. |
| `POST /admin/tests/{test_id}/publish` | Administrator+ | Validates all questions/revisions, schedules, resolved marks, attempt limits, and result policy; atomically publishes version. |

Phase 8 local backend implementation adds `POST /admin/tests`, `POST /admin/tests/{test_id}/versions`, and `POST /admin/tests/{test_id}/versions/{version_id}/publish`. Draft creation/versioning require editor+; publish requires administrator+. Each operation writes a sanitized `admin_audit_log` event in the same transaction. These routes remain unavailable while trusted role lookup is disabled and the role/audit migration remains unapplied.

Admin URLs are grouped under `/admin` for clarity, but authorization is enforced by dependencies/services rather than path prefix alone.

The implemented public question endpoints run PostgreSQL `REPEATABLE READ, READ ONLY` transactions and issue only `SELECT` statements. Answer fields are permitted in this practice projection only. Any future active-test session API must use a separate projection that omits answers, explanations, and correctness metadata.

Example list request:

```http
GET /api/v1/questions?page=1&page_size=10&subject=Mathematics&year=2026&sort=question-number
```

The response envelope is `{ "items": [<legacy question rows>], "page": 1, "page_size": 10, "total": 50, "has_more": true }`. The row field names match the existing frontend legacy adapter (`exam_year`, `correct_option`, `created_at`, and the other existing question fields).

## Attempts and answers

| Method and path | Auth / role | Contract and behavior |
| --- | --- | --- |
| `GET /tests?page=1&page_size=12` | Student | Implemented locally. Lists published public tests with duration, question count, schedule, attempt count, and the caller's active attempt ID. It never returns question content or answer data. |
| `POST /tests/{test_id}/attempts` | Student; owner for private test | Implemented locally. Locks the published version, enforces schedule/attempt limits, creates a persisted question/option-order snapshot, and resumes an existing active attempt on retry. Returns database-owned times and a safe projection without correctness/explanation fields. |
| `GET /attempts/{attempt_id}` | Owning student | Implemented locally. Recovers the persisted safe session; when read after the deadline, it performs an idempotent timer submission before returning the terminal session. |
| `PUT /attempts/{attempt_id}/answers/{attempt_question_id}` | Owning student, active and before deadline | Implemented locally with request `{selected_option_id, expected_version}`. Locks the owning attempt, validates option membership, and applies compare-and-swap versioning. |
| `PUT /attempts/{attempt_id}/navigation` | Owning student | Implemented locally. Saves current question, visited state, and review flag after verifying that the question belongs to the attempt. No score effect. |
| `POST /attempts/{attempt_id}/submit` | Owning student; active or deadline-expired | Implemented locally. Accepts only `student_submitted`; the server selects `timer_expired` at/after deadline. It locks, scores from the version snapshot, writes one submission/result/section breakdown transactionally, and returns a score-free receipt. Retries replay the same receipt. |
| `GET /attempts/{attempt_id}/result` | Owning student after release | Implemented locally. Returns score and section counts only after `after_submit` or the configured timezone-aware `results_at`; pre-release, missing, and foreign attempts share `404`. |
| `GET /attempts/{attempt_id}/review` | Owning student after review release | Implemented locally. Returns persisted question/option order, selected/correct choices, awarded marks, and explanation only after `with_results`, configured `answers_at`, or never (unavailable). |
| `GET /students/me/attempts?page=1&page_size=20` | Student | Implemented locally. Lists only the caller's attempts and suppresses scores/review availability until the version policy releases them. |
| `GET /students/me/dashboard` | Student | Implemented locally. Returns caller-owned attempt/completion totals and averages/best percentage across released results only. |

Test-version authoring accepts `review_policy` with `results: after_submit | at_time`, optional timezone-aware `results_at`, `answers: with_results | at_time | never`, and optional timezone-aware `answers_at`. Defaults are `after_submit` and `with_results`. Scheduled answer review cannot precede a scheduled result. Leaderboards are not implemented until opt-in preferences, privacy rules, and score normalization are available.

### Safe active session example

```json
{
  "attempt_id": "uuid",
  "test_title": "NIMCET Mock Exam",
  "server_time": "2026-11-01T12:00:00Z",
  "started_at": "2026-11-01T11:30:00Z",
  "deadline_at": "2026-11-01T13:30:00Z",
  "status": "in_progress",
  "sections": [{ "id": "uuid", "title": "Mathematics", "question_ids": ["attempt-question-uuid"] }],
  "questions": [{
    "attempt_question_id": "uuid",
    "question_id": "legacy-id",
    "content": { "version": 1, "prompt": [], "options": [{ "id": "opt-a", "content": [] }] },
    "displayed_option_order": ["opt-a"],
    "answer": { "selected_option_id": null, "version": 0 },
    "state": { "visited": false, "marked_for_review": false }
  }]
}
```

No official key, scoring values, explanation, or correctness signal is present in the session response.

The current Phase 8 draft snapshots legacy question text/options/answer indexes into a test version because immutable `question_revisions` are not implemented yet. The verified legacy `questions.id bigint` is also referenced with a restrictive FK. This is an interim local design and must be reconciled with question revisions before production approval. Timer expiry is enforced on submission and lazy recovery; a scheduled background sweeper is not configured yet.

## Bookmarks, collections, reports, and student data

| Method and path | Auth / role | Contract and behavior |
| --- | --- | --- |
| `GET /bookmarks` | Student | Lists only caller's bookmarks, paginated and filterable. |
| `PUT /bookmarks/{question_id}` | Student | Idempotently creates bookmark for a published question; uniqueness enforced. |
| `DELETE /bookmarks/{question_id}` | Student | Deletes only caller's bookmark; repeated delete returns success/no-content. |
| `GET /collections` | Student | Lists caller-owned collections and counts. |
| `POST /collections` | Student | Creates collection; validates normalized name and limits. |
| `PATCH /collections/{id}` | Owner | Renames own collection. |
| `DELETE /collections/{id}` | Owner | Deletes collection membership/container only; never deletes questions. |
| `PUT /collections/{id}/questions/{question_id}` | Owner | Idempotently adds question to own collection. |
| `DELETE /collections/{id}/questions/{question_id}` | Owner | Removes own mapping. |
| `POST /questions/{question_id}/reports` | Student | Creates categorized report with bounded description; rate-limited and tied to caller. |
| `GET /admin/question-reports` | Administrator+ | Filter/status pagination; returns only report data needed for review. |
| `PATCH /admin/question-reports/{id}` | Administrator+ | Updates review status/resolution and audit record. |
| `GET /students/me/dashboard` | Student | Implemented locally for test attempt/completion and released-score aggregates. Bookmark/report aggregates remain future work. |
| `GET /students/me/attempts` | Student | Implemented locally for owner-only attempt history with release-aware score fields. |
| `PATCH /students/me/preferences` | Student | Own validated preferences and leaderboard opt-in. |

## Admin and audit

| Method and path | Auth / role | Contract and behavior |
| --- | --- | --- |
| `GET /admin/dashboard` | Editor+ | Implemented read-only counts over the existing `public.questions` table. |
| `POST /admin/users/{user_id}/roles/{role_code}` | Super administrator | Locally implemented trusted role grant with required reason and same-transaction audit entry. Rejects self-change. Requires role migration and database-backed role lookup. |
| `DELETE /admin/users/{user_id}/roles/{role_code}` | Super administrator | Locally implemented role revocation with required reason and same-transaction audit entry. Rejects self-change and last-super-administrator removal. Requires role migration and database-backed role lookup. |
| `GET /admin/audit-log` | Super administrator | Locally implemented paginated role-audit events. State diffs are allowlisted and redacted; requires role migration and database-backed role lookup. |
| `GET /admin/users` | Administrator+ scoped | Search safe profile/status fields only; no email enumeration for lower roles unless needed. |
| `PATCH /admin/users/{user_id}/status` | Administrator+ scoped | Applies allowed account status action and records audit. |
| `POST /admin/imports/validate` | Editor+ | Validates CSV/JSON/XLSX upload and returns row-level report; no rows silently skipped. |
| `POST /admin/imports` | Editor+ | Imports only validated batch with idempotent import ID, per-row outcomes, and recovery information. |

## Rate limits and audit rules

- Rate-limit login-adjacent actions, upload URL creation, question reports, attempt starts, answer writes, and imports. Use user and IP dimensions where privacy/legal policy permits.
- Audit question/test create/edit/approve/publish/archive, role changes, user status changes, media deletion, imports, attempt termination, and administrative result actions.
- Never audit passwords, Auth tokens, full media bytes, or private student response content.
- Automated timer expiration calls the same internal submission service as manual submission; it does not need a public unauthenticated endpoint per attempt.

## Contract sequencing

Before implementation, validate these contracts against actual schema and auth configuration. Phase 2 may implement health/auth and read-only question endpoints first. Any endpoint exposing answers or allowing writes waits for its own authorization and integration checks. API versioning does not waive backward compatibility inside an already-deployed `/v1` contract.
