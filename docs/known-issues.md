# Known Issues and External Dependencies

## Confirmed from this checkout

- A modular FastAPI backend foundation and read-only legacy question browse/detail/facets API now exist under `backend/`. The student app has an adapter for those reads but continues using Supabase by default.
- The current student app still uses Supabase JS unless `VITE_QUESTION_API_MODE=backend` is set. Its existing published question list and detail queries select all columns; normalized question records include the zero-based `correct_option`, and the detail page displays answers/explanations.
- Bookmark, attempted-question, PYQ, and test navigation is placeholder behavior and does not persist student data.
- Structured rich content, mixed-content options, stable option IDs, and media upload/rendering are absent.
- No source-verified PYQ papers or mappings exist in this checkout. Existing 2026 question rows are not assumed to represent a complete historical paper.
- The backend suite has 42 passing unit tests, but no repository has been tested against the live Supabase database or a confirmed least-privilege runtime role.
- The frontend backend adapter has five isolated HTTP client tests, but has not been verified against a running non-production FastAPI service.
- The separate `admin/` app has a fail-closed role gate, read-only question counts, role management, and a redacted role-audit list. It is not a usable editorial console: the database role resolver is disabled by default and question editing/media/publishing APIs are absent.
- `TRUSTED_ROLE_LOOKUP_ENABLED` is false in local FastAPI configuration. Keep it false until the owner-specified Auth UUID, the question/Auth count discrepancy, extra public test policies/view, backend runtime grants, and bootstrap prerequisites are reconciled.
- A read-only linked check on 2026-11-04 found PostgreSQL 17.11, all four local migrations recorded as applied, and exact role/audit table columns. The role migration tables have RLS enabled, no policies, and no direct anon/authenticated SELECT/INSERT. The current DB connection is `postgres`, owner with RLS bypass; the deployed FastAPI role remains unknown.
- The current linked project has one `public.questions` row versus 102 in the 2026-11-01 audit, and the owner-specified Auth UUID is absent (one Auth user exists). Four published-read policies and a `security_invoker` view exist outside the local migration definitions; an extra view is not a table and applies the underlying table's RLS. Reconcile these current-state differences before further production changes. No production SQL was applied by this work.
- Current environment verification has blockers: Node's multi-file test runner and Vite safe-path helper return `spawn EPERM`; the production build also cannot load the Tailwind native Windows binding. The in-process frontend tests and ESLint pass.

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
- Test sessions omit answer keys/explanations and store attempt-specific question/option ordering. Expired attempts are finalized on a recovery or submit request; no scheduled worker exists. Scores are stored transactionally but no result/review endpoint or release policy is implemented.
- The test draft snapshots legacy question content because immutable question revisions are not implemented; this is temporary and must be reconciled before production approval.
- `questions.id` is verified as `bigint GENERATED BY DEFAULT AS IDENTITY`; the backend detail repository now validates numeric IDs and uses typed equality, with unit coverage for malformed IDs.

## Planned handling

- Preserve the current central `questions` repository and existing Auth users.
- Do not use browser question payloads as active exam sessions; create a backend response projection that excludes keys until review is allowed.
- Do not apply migrations until live database evidence is captured, migration history/default privileges are reconciled, and the migration has been rehearsed against a disposable compatible database.
- Keep the backend question adapter disabled until a non-production API and least-privilege database connection are verified.
