# Phase 5 — Results and PYQ development, 2026-11-16

Readiness: **development-ready, not production-verified**. Phase 3 and Phase 4
as a whole are not declared complete by this work. Both existing frontends,
FastAPI, canonical questions, attempt IDs and working result APIs were preserved.
Unrelated working-tree changes were retained. No original question dataset was
read, recovered, processed or imported. No production write, migration, role
assignment, Storage change, worker execution or deployment was performed.

## Implemented

| Area | Delivered |
| --- | --- |
| Individual PYQ | Dedicated `/pyq` hub links to the Phase 2 canonical question browser with PYQ-only filters and server-side practice feedback |
| Year-wise papers | Authenticated exam/year filters, pagination, verified source citation, section counts/marking, original duration, personal attempt usage, start/resume using the existing test engine |
| Completeness | Administrator approval checks draft PYQ type, examination, source/key verification attestations, exact duration, complete section blueprint, contiguous section/question ordering, four-option MCQ snapshots and marking scheme; shuffle is rejected |
| Approval integrity | SHA-256 digest binds approval to question IDs, content, answer/solution snapshots, order and marking. Publication reruns validation and checks the digest under the existing version lock. Changed papers require fresh approval |
| Private results | Existing ownership checks retained and exercised through real repository/API tests; unreleased/foreign results and review return 404 |
| Release policy | Timed answer review cannot bypass unreleased/never-released results or report a release timestamp before the result. Scheduled visibility is evaluated from the immutable policy/server time; no release-time UPDATE is needed |
| Finalization | Existing transactional/idempotent backend scoring retained; added a bounded server-side expiration command and database guards against editing finalized results, section results or answers |
| Reproducibility | Stored evaluation version retained; descriptive scoring version added; published question/solution rich blocks are snapshotted and rendered from the test version, not current canonical content |
| Review | Shared rich-option/image/math rendering, correct/incorrect/unanswered filters preserving attempt order, snapshot explanations and awarded marks |
| Analytics | Private correct/incorrect/unanswered totals, explicitly defined accuracy and coverage, aggregate section performance and the latest 20 released-result records; withheld results excluded |
| Client privacy | Results/history components remount when account identity changes; answer-review state also resets between attempt IDs |

Source verification is an explicit administrator attestation against a cited
source. Code validates structural completeness against that supplied blueprint;
it does not independently establish the authenticity of a historical paper.
No source question import or recovery mechanism was added.

## Contracts and configuration

New routes, under `/api/v1`:

- GET `/pyq/papers?exam=&year=&page=&page_size=`: latest published approved
  version per public PYQ test, with source/blueprint and current user's usage.
- POST `/pyq/papers/{version_id}/attempts`: start exactly the chosen version;
  the existing availability, attempt-limit, ownership, persistence and scoring
  rules apply. A new execution engine was not introduced.
- GET `/admin/pyq/candidates`: up to 100 draft versions for Test Managers and
  administrators. Editors/students cannot use this endpoint.
- POST `/admin/pyq/versions/{version_id}/approve`: administrator-only, accepts
  `PYQApprovalRequest` from `backend/app/schemas/pyq.py`; records approval/audit.
- POST `/admin/tests/{test_id}/versions/{version_id}/publish`: existing route;
  PYQ publication now additionally requires current approval/digest validation.
- GET `/students/me/performance`: authenticated released-result analytics only.

The regular `/tests` catalog now excludes PYQ entries: papers are presented
through the validated year-wise catalog, preventing an unapproved paper from
appearing complete through the generic listing. Direct starts of unapproved
PYQ versions are also rejected. Existing attempt recovery/result routes remain
available, including when new Phase 5 features are disabled.

The migration is the CLI-generated
`supabase/migrations/20261115215520_phase5_results_pyq.sql`; its timestamp follows
the host clock. It adds the private `pyq_papers` relation with approval/digest,
rich question/solution snapshot columns, scoring-version metadata, and immutable
result/answer/approval guards. New database functions use invoker privileges,
fixed search paths, and revoked PUBLIC/browser EXECUTE grants. New metadata has
RLS and no direct browser grants. Runtime grants are conditional on the existing
`nimcet_backend` role, including narrow UPDATE privileges on draft rich-snapshot
columns. Published snapshots remain protected by existing immutability triggers.

`PHASE5_ENABLED=false` is documented in `backend/.env.example` and remains the
default. No ignored `.env` was changed. Enable only after migration/staging
checks. `TEST_ENGINE_ENABLED` is also required. The individual rich-question/PYQ
practice and media paths depend on Phase 2's schema, Storage configuration and
`QUESTION_AUTHORING_ENABLED`. The hub and admin verification panel show real
unavailable/empty states when those dependencies are not configured.

Accuracy is `correct / (correct + incorrect) × 100`; it is null when no question
was attempted. Coverage is `correct / total_questions × 100`; it is null for an
empty result. Both use decimal arithmetic and two-decimal rounding. Score
percentage remains distinct and can be negative under negative marking.

## Server-side expiration command

Run from `backend/`:

```text
python scripts/finalize_expired_attempts.py --limit 50
```

This defaults to a read-only dry run. In an explicitly approved environment:

```text
python scripts/finalize_expired_attempts.py --limit 50 --apply
```

An external scheduler should run it regularly with the backend runtime identity.
It selects only overdue active attempts, bounds batches to 1–500, and delegates
to the existing locked/idempotent submission transaction. Concurrent sweeps may
pick the same candidate; submission safely replays its stored outcome. Failures
are logged without raw SQL, credentials or student identity; a nonzero exit
status lets the scheduler alert. Active failed attempts remain eligible for the
next sweep. Operators must retain/monitor those logs and alert on repeated
failures; this is not a durable job queue or an installed production scheduler.
The command was tested with synthetic fixtures, not run against production.

## Validation executed

- Full backend suite: **124 passed**, including Phase 5 release/ownership,
  completeness/digest, metric denominators, version pinning and worker checks.
  Windows Selector policy and out-of-sandbox loopback access were needed for
  FastAPI TestClient; fixtures were synthetic.
- JavaScript suite: **22 passed**, including review classification/order tests.
- Student build: passed. Admin build: passed with its existing large-bundle
  advisory. Student ESLint and targeted admin ESLint: passed.
- Isolated migration replay: passed via
  `node backend/scripts/rehearse_phase5.mjs`, using the existing ignored PGlite
  installation (PostgreSQL 18.6). It replays local migrations and checks immutable
  published snapshots, canonical-edit independence, finalized answer/score/section
  rejection, immutable PYQ approval, scoring version, runtime metadata visibility
  and anonymous denial. It does not connect to Supabase.
- Whitespace validation: `git diff --check` passed during implementation.

The test counts include existing suites; they are not counts of entirely new
tests. The in-memory rehearsal is not a PostgreSQL 17/Supabase integration test.

## Activation, approvals and remaining work

1. Review and reconcile the live schema/grants against both the Phase 2 and Phase
   5 drafts. Check any external process that writes result/release fields before
   installing the new immutability guards.
2. Replay on isolated Supabase/PostgreSQL 17, configure private Storage, and
   verify editor → rich question → test snapshot → source attestation → paper
   approval → publication → student attempt → finalization → release → review.
3. Exercise multiple accounts, scheduled/never release, network recovery,
   simultaneous sweeps, worker retries, archived canonical questions and image
   access in a real browser. Public published test snapshots preserve media
   references after canonical archival. Private-test media authorization needs
   separate verification before private test workflows are released.
4. Finish the broader Phase 3/4 workflows as needed. The verification panel
   consumes existing draft test versions; it does not replace the full test
   authoring/review console.
5. Verify a backup/recovery plan and obtain explicit owner approval for production
   migrations, configuration/deployment and scheduling a write-capable worker.
   No production approval is inferred from the development request.

No browser visual/end-to-end QA, real student attempt, factual source-paper
verification, PostgreSQL 17 staging run or production deployment was performed
in this development pass. Do not label the whole project production-ready.

For rollback, disable new features and stop any newly installed worker first.
Preserve new metadata/snapshots/results. Do not drop data or remove historical
integrity guards automatically. Existing private result reads remain compatible
before migration through additive response fields and optional JSON projections.
