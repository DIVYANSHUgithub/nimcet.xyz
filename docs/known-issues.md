# Known Issues and External Dependencies

For the current evidence-based repository and live Supabase audit, see [Phase 0 audit (2026-11-05)](phase-0-audit-2026-11-05.md).

The initial redacted configuration/security verification is [Phase 1 security validation (2026-11-06)](phase-1-security-validation-2026-11-06.md); the latest connection, grants, bootstrap, test, and policy recheck is [Phase 1 security retest (2026-11-15)](phase-1-security-retest-2026-11-15.md).

## Confirmed from this checkout

- A modular FastAPI backend foundation and read-only legacy question browse/detail/facets API now exist under `backend/`. The student app has an adapter for those reads but continues using Supabase by default.
- The current student app still uses Supabase JS unless `VITE_QUESTION_API_MODE=backend` is set. Published question list/detail queries select all columns, so `correct_option` and `explanation` remain visible in the browser payload. The question detail UI now waits for a selected option before displaying answer feedback; this is a presentation rule, not answer-key protection.
- Bookmarks and attempted-question tracking remain placeholders; PYQ workflows are missing. Test catalogue, attempt, result, and history screens exist, but the API feature flag is off by default and live persistence has not been verified.
- Structured rich content, mixed-content options, stable option IDs, and media upload/rendering are absent.
- No source-verified PYQ papers or mappings exist in this checkout. Existing 2026 question rows are not assumed to represent a complete historical paper.
- The backend test suite collects 61 tests but currently stalls while starting the first FastAPI `TestClient` request (`test_admin_dashboard_requires_backend_role_before_reading_counts`) under Python 3.13.5 / pytest 9.2.0. A faulthandler trace stops in Python's Windows Proactor event-loop self-pipe `socketpair()` accept; the application route is not reached. The run was interrupted; no live database integration test was run.
- The frontend backend adapter has five isolated HTTP client tests, but has not been verified against a running non-production FastAPI service.
- The separate `admin/` app has a fail-closed role gate, read-only question counts, role management, and a redacted role-audit list. It is not a usable editorial console: the database role resolver is disabled by default and question editing/media/publishing APIs are absent.
- `TRUSTED_ROLE_LOOKUP_ENABLED` is false in local FastAPI configuration. Keep it false until the owner-specified Auth UUID, the question/Auth count discrepancy, extra public test policies/view, backend runtime grants, and bootstrap prerequisites are reconciled.
- A read-only linked check on 2026-11-04 found PostgreSQL 17.11, all four local migrations recorded as applied, and exact role/audit table columns. The role migration tables have RLS enabled, no policies, and no direct anon/authenticated SELECT/INSERT. The current DB connection is `postgres`, owner with RLS bypass; the deployed FastAPI role remains unknown.
- An earlier linked check on 2026-11-04 observed one `public.questions` row versus 102 in the 2026-11-01 audit, and reported the owner-specified Auth UUID absent (one Auth user existed). The user identity was not rechecked on 2026-11-05 and must be verified before any owner-specific operation. Four published-read policies and a `security_invoker` view exist outside the local migration definitions; current live details are in the 2026-11-05 Phase 0 audit. No production SQL was applied by this work.
- On 2026-11-05, the student Node test suite passed (17 tests), ESLint passed, and the student production build passed. The admin build wrapper was corrected and `npm run admin:build` passed from `clientFront/`. The backend pytest suite is currently blocked by the `TestClient` stall described above.

## Requires external verification

- JWT/Auth provider/redirect settings, trusted role bootstrap, backend runtime DB connection/role, complete migration history, Storage bucket visibility/settings and object inventory.
- Production Vercel settings, deployed version, and whether live behavior matches this branch.
- The Supabase CLI is authenticated and linked for read-only checks. `supabase/config.toml` remains local-only; no production migration has been applied by this work.
- The 2026-11-01 anon REST audit confirmed 102 visible published questions; the 2026-11-04 linked database check found one question total. Anon REST does not reveal hidden rows or migration state, so reconcile the snapshots before any data backfill or schema change.
- `questionImage` is owner-identified but its metadata and policies were not exposed to anon. One question contains a persisted signed URL; it remains untouched pending authenticated object inventory.
- The prepared RLS smoke SQL checks only the existing `questions` relation and is not a substitute for student A/student B ownership tests on future tables. Those tests require schema/policies and isolated fixtures.
- The backend intentionally has no verified hosted JWT verifier or least-privilege DB URI. `/ready` returns 503 until the verified signing settings and a least-privilege TLS database URL are configured.
- The Phase 2 role resolver grants only `student`; trusted role lookup and any elevated role remain unavailable until the role schema and assignments are reviewed and migrated.
- The backend question repository issues read-only queries against `public.questions`, but live API compatibility and privileges have not been verified. It does not modify application tables.
- Phase 8 test-engine routes and a local SQL migration exist; the remote ledger records the migration as applied, and the schema passed a disposable PostgreSQL 17.6 rehearsal. Extra published-read policies and a `security_invoker` view exist in production outside the local migration and need provenance review. Role lookup remains disabled, so protected authoring/publish routes return 403 by default.
- Test sessions omit answer keys/explanations and store attempt-specific question/option ordering. Result/review endpoints, release-policy logic, attempt history, analytics, and student result screens exist in code, but are not live-verified and remain behind the disabled test-engine flag. Expired attempts are finalized on a recovery or submit request; no scheduled worker exists.
- The test draft snapshots legacy question content because immutable question revisions are not implemented; this is temporary and must be reconciled before production approval.
- `questions.id` is verified as `bigint GENERATED BY DEFAULT AS IDENTITY`; the backend detail repository now validates numeric IDs and uses typed equality, with unit coverage for malformed IDs.

## Planned handling

- Preserve the current central `questions` repository and existing Auth users.
- Do not use browser question payloads as active exam sessions; create a backend response projection that excludes keys until review is allowed.
- Do not apply migrations until live database evidence is captured, migration history/default privileges are reconciled, and the migration has been rehearsed against a disposable compatible database.
- Keep the backend question adapter disabled until a non-production API and least-privilege database connection are verified.


## Current admin follow-up — 2026-11-16

The earlier admin placeholders are superseded by `admin-development-2026-11-16.md`. Local workflows and automated checks are implemented. Remaining limits are explicit: directory text/role/status filtering is per page (global UUID lookup is supported), computer-use initialization prevented browser QA, PGlite is not the hosted PostgreSQL version, and Auth/Storage/runtime-grant/concurrency verification and production activation have not occurred. New admin functionality defaults off and requires the reviewed migration and server configuration. The prior TestClient stall is avoided using WindowsSelectorEventLoopPolicy with permitted local loopback access.
