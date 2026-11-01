# Implementation Progress

## Phase 0 — Repository audit

**Status:** Complete for repository-visible facts; live Supabase verification remains external.

- Inspected the Vite/React app, route tree, Supabase client and auth flows, question API and normalization, question renderer, question filters, README, Vercel SPA rewrite, env template, Git ignore rules, and existing test file.
- Confirmed current app routes: `/`, `/questions`, `/questions/:questionId`, `/login`, `/signup`, `/reset-password`, and fallback.
- Recorded the README-described question table columns and explicitly marked them unverified against the live database.
- An initial sandboxed PostgREST schema request could not reach Supabase; later authorized read-only API checks are documented under Phase 1.5.
- Confirmed no backend, admin app, migrations, schema/policy export, or Storage implementation exists in this checkout.
- Created `docs/architecture-audit.md`, `docs/implementation-roadmap.md`, `docs/progress.md`, and `docs/known-issues.md`.
- Created branch `codex/phase-0-architecture-audit` as required.
- **Tests executed:** none. Phase 0 is an inspection/documentation phase; checks are deferred to the verification phases.
- **Database changes:** none. **APIs added:** none.

### Phase 0 limitations

- Could not verify live Supabase schema, table contents, constraints, RLS, Auth provider/redirect settings, Storage buckets/policies, or production deployment settings.
- Did not run the current test suite; source inspection found a test import for absent `src/data/questions.js`, which is recorded as a likely blocker to confirm during test execution.

### Next phase entry criteria

- Obtain a safe, read-only schema/policy/Storage inventory for the intended Supabase project and representative sanitized question rows.
- Confirm the target test environment and database access before writing migrations or integration tests.

## Phase 1 — Architecture and database design

**Status:** Design package complete; live schema validation outstanding. Do not author or run migrations until the external inventory is available.

- Defined student/admin/backend/database ownership, FastAPI domain boundaries, JWT and role verification, database access strategy, API error/pagination conventions, and rollout sequence in `docs/architecture.md`.
- Specified a versioned rich-content contract with stable option IDs, a legacy adapter plan, immutable question/test revisions, media asset lifecycle, test/attempt/result transactions, and a role/ownership matrix.
- Proposed normalized catalog, question revision, media, role, test/PYQ, attempt/answer/result, bookmark/collection/report, and audit entities in `docs/database-schema.md`.
- Specified versioned API groups, endpoint methods, auth roles, key request/response behavior, idempotency, and the answer-key-safe active session projection in `docs/api-reference.md`.
- No source code, database schema, migrations, policies, or APIs were changed. No tests were run; this phase produced design artifacts only.
- **Unresolved gate:** actual SQL types, constraints, RLS, Auth roles, Storage policies, migration history, and DB connection mode still require privileged inspection before DDL or production authorization changes.

### Phase 1 exit status

The architecture, schema proposal, and API contract are reviewable. The phase is complete for design; it is not complete for schema compatibility validation. Phase 2 may proceed with isolated backend scaffolding and mocks, but database repositories/migrations and any production-targeting work must wait for the live inventory.

## Phase 2 — Backend foundation

**Status:** Local foundation implemented and verified; live Supabase configuration remains pending.

- Added a modular FastAPI app under `backend/app`, with settings, versioned routing, health/readiness endpoints, a current-user endpoint, consistent error handling, request IDs, secret-safe JSON logging, exact-origin CORS, and lazy SQLAlchemy connectivity.
- Added Supabase JWT verification for explicit HS256 legacy-secret or asymmetric JWKS modes. It validates signature, configured algorithm, `iss`, `aud`, `exp`, `iat`, and `sub`; JWKS URLs must match the configured project host. No JWT settings or secret are assumed in the template.
- Added a role resolver boundary that grants only `student` until a trusted role schema is designed and migrated. Token `role` and user metadata cannot grant editor/admin roles.
- Added an isolated requirements file, pytest config, backend README, and tests covering valid/invalid/expired tokens, issuer/audience, asymmetric verification, role denial, CORS allow/deny, error redaction, and database readiness behavior.
- `backend/.venv/Scripts/python -m pytest`: **14 passed**. `python -m compileall -q app tests`: passed. Uvicorn started locally; `/health` returned 200 with request ID, `/ready` returned 503 without configured dependencies, and `/api/v1/auth/me` returned 401 without a token.
- Database access is limited to a `SELECT 1` readiness check. No application-table queries, migrations, Supabase writes, or production changes were made.
- **Remaining external configuration:** verify the hosted JWT signing mode/issuer/audience; set server-only verification configuration; securely provide a least-privilege TLS database URL; then verify a real token and readiness against an approved non-production database. Full role lookup remains blocked on schema verification.

## Phase 1.5 — Supabase infrastructure audit/preparation

**Status:** Read-only production database audit received; Auth, Storage, and complete migration-state verification remain pending.

- The owner verified Supabase CLI authentication and that the NIMCET.XYZ project is linked.
- Recorded the supplied live findings in `docs/supabase-live-schema-audit-results.md`: PostgreSQL 17.6; the `public.questions` table and sequence; 15 columns; listed constraints/indexes; RLS/policy/grant/role findings; function, event trigger, extensions, migration metadata, and question counts.
- The section distribution in `docs/audit-results/questions-distribution.json` agrees with the 102-question audit total.
- Pending checks are listed in `docs/supabase-live-schema-audit-results.md`, including exact constraint definitions, sequence configuration, detailed grant matrix, Storage policies, Auth JWT configuration, complete migration history, and backend connection mode/role.
- `docs/supabase-live-schema-audit.md` retains the earlier anon/API-only baseline and should be read together with the newer live result report; the new report is the current catalog finding record.
- No production object, record, grant, policy, Storage setting, Auth setting, or migration history was changed by this audit reporting work.

### Phase 1.5 exit status

The read-only catalog results needed to begin additive schema drafting have been supplied. Full migration-history reconciliation, Storage review, Auth/JWT review, and connection-role verification remain open. No production changes were made.

## Phase 3 — Database migrations

**Status:** Catalog design and local draft rehearsed; production application is not ready for approval.

- Reviewed the hierarchy against the design and current question labels: examinations own independent sections and subjects; subjects own chapters/topics. Equal 2026 section/subject labels do not establish semantic identity, so no one-to-one mapping is imposed. No question FK is added while its exact SQL type is unavailable.
- Selected FastAPI-managed `updated_at`: PostgreSQL defaults timestamps on insert, and FastAPI must set `updated_at` in every update. The migration has no timestamp triggers; the disposable smoke test covers insert defaults, explicit update, and absence of triggers.
- Retained `active`/`inactive`, documented inherited availability through every ancestor, and added test predicates for inactive exam/subject/chapter/section cases. Student API enforcement remains future work.
- Reviewed all nullability, constraints, FK `RESTRICT` behavior, and indexing. Each FK is the leading column in a scoped unique index; no duplicate FK or speculative display-order indexes were added.
- Updated `supabase/migrations/20261101000000_create_catalog_tables.sql` to create examinations, sections, subjects, chapters, and topics. RLS is enabled on all five, with no policies, explicit grants, or changes to existing objects.
- Added `supabase/tests/catalog_migration_smoke.sql`. Rehearsal passed on an isolated in-memory **PostgreSQL 17.4** instance: migration apply, five tables, 33 constraints (5 PK, 5 unique, 4 FK, 19 check), 10 indexes, 38 non-null columns, UUID/timestamp defaults, RLS on all tables, zero policies/triggers, and behavior checks for uniqueness, checks, nulls, FK violations, `ON DELETE RESTRICT`, inactive ancestry, client-role RLS denial, and `service_role` BYPASSRLS. Fixture grants and rows rolled back. Separate injected-failure and object-conflict checks passed; transactional rollback left no partial catalog tables and preserved the pre-existing conflict object.
- Rehearsal's stock PostgreSQL default ACL matrix had zero default ACL entries, no table ACLs, and no SELECT privilege for `anon`, `authenticated`, `service_role`, or a non-bypass backend role before test-only grants. This is not evidence of Supabase production defaults.
- `npx supabase migration list --linked` failed during login-role initialization with `DbConfigLoginRoleNetworkError: TransportError` and returned no history rows. Complete migration history, production `pg_default_acl`, and actual per-role object privileges remain unresolved.
- **Gate:** Do not baseline or apply in production until migration history and applicable default ACLs/role privileges are verified and a disposable Supabase/PostgreSQL 17.6 rehearsal is completed. No migration was applied to the Supabase local stack or production; only an in-memory PostgreSQL 17.4 rehearsal was run. No production RLS policy change was made.

## Phase 4 — Question Bank API and media

**Status:** Read-only legacy question API slice implemented and unit tested; media, writes, and live integration remain gated.

- Added `GET /api/v1/questions` with published-only filtering, page pagination, exact totals, exam/section/subject/topic/difficulty/year/type/search filters, stable sorting, and an out-of-range page clamp.
- Added `GET /api/v1/questions/facets` for published subject/topic values and `GET /api/v1/questions/{question_id}` for published detail.
- Queries select the explicit legacy question projection, never `*`, and run in PostgreSQL `REPEATABLE READ, READ ONLY` transactions. Database failures return generic 503 responses without logging query details.
- The practice projection includes `correct_option` and `explanation`, matching the currently public practice behavior. It must not be reused for active test sessions.
- Added API tests for filtering, pagination clamping, validation, published detail/facets, and generic database errors. Added repository SQL tests for published-only predicates, bound parameters, explicit projections, pagination, stable order, and published-only facets.
- `backend/.venv/Scripts/python -m pytest`: **23 passed**. `backend/.venv/Scripts/python -m compileall -q app tests`: passed.
- No table writes, migrations, RLS policies, Storage operations, or Phase 5 frontend integration were added in the Phase 4 API slice. CRUD/revisions and media work remain gated on migration history, exact legacy ID/sequence, privilege, Auth, and Storage verification. The frontend adapter was started under Phase 5 below.
- No live Supabase database connection or verified server-side JWT/DATABASE_URL configuration is available, so live-schema integration and a production/hosted question-read check remain pending. Unit tests use a stub repository and fake connection; they do not establish compatibility with the live database driver or privilege matrix.

### Phase 4 exit status

The read-only API implementation slice and local unit tests are complete. Phase 4 as a whole is still open: live-schema integration, least-privilege connection verification, media inventory/policy review, and any approved media workflow remain unverified or unimplemented. No production changes were made.

## Phase 5 — Student frontend integration

**Status:** Backend question-read adapter integrated behind an environment switch; non-production API verification and rollout remain pending.

- Added a shared backend HTTP client with an environment-provided base URL, optional Supabase access-token forwarding, request cancellation, cookie omission, and sanitized network/API errors.
- Routed existing question list, detail, facets, and callers such as daily/featured questions through the selected adapter without changing page routes or rendering. Set `VITE_QUESTION_API_MODE=backend` to use FastAPI; `supabase` remains the default to preserve current behavior until the backend is configured and verified.
- Replaced the stale frontend test's import of missing `src/data/questions.js` with a synthetic fixture test for zero-based answer mapping.
- Combined in-process import of both frontend test files: **11 passed**; each file also passed when run individually. `npm test` could not launch Node's multi-file test workers (`spawn EPERM` in this environment). `npm run lint`: passed after removing the unused binding and deriving refresh/loading state without synchronous effect updates. `npm run build` is blocked because the installed Tailwind native Windows binding is missing and Vite's safe-path child process also returns `spawn EPERM`.
- No live backend/API request was made. Keep backend mode disabled until its database URL/role, CORS, and question-read behavior are verified in a non-production environment. Phase 4's media and live-integration work also remains open; no production changes were made.

## Phase 6 — Admin application

**Status:** Fail-closed admin application, read-only dashboard, and local role assignment API implemented; editor workflows and database-backed roles are not enabled.

- Added `admin/` as a separate Vite/React app with its own entry point, config, and styles. It reuses the existing Supabase Auth session and root environment configuration.
- The app calls backend `/auth/me`, shows read-only question counts, and grants UI access only when the trusted role response includes `editor`, `administrator`, or `super_administrator`. A super administrator can grant/revoke elevated roles with a reason. Browser metadata never grants access.
- Added opt-in `DatabaseRoleResolver` (`TRUSTED_ROLE_LOOKUP_ENABLED=false` by default), generic transactional DB boundary, audited role grant/revoke routes, self-change rejection, and last-super-administrator protection. Role changes and audit rows share one DB transaction.
- Added local-only `20261101010000_create_trusted_roles_and_admin_audit.sql`, with role seeds, active-assignment uniqueness, audit fields, RLS enabled, no policies, and explicit revocation of default table/sequence privileges from `anon` and `authenticated`. The disposable smoke script checks all client table privileges and the identity sequence. The revised migration has not been rehearsed.
- A linked read-only audit verified `auth.users.id` is `uuid NOT NULL`, matching the draft FK type. It also verified broad production default ACLs for future `public` tables/sequences created by `postgres` and `supabase_admin`. The catalog and role drafts now revoke client privileges from only their new objects. The actual migration executor/backend privilege path remains unverified.
- The first super-administrator bootstrap is not automated; it requires an owner-approved identity and a secure non-production procedure. Question editing/revisions/publication, media operations, and preview validation remain unimplemented because revision identity, Storage configuration, and runtime authorization are not verified.
- Added `npm run admin:dev` and `npm run admin:build`; admin output is ignored by Git. Added backend role/dashboard/role-mutation tests and frontend role-gate tests.
- Combined in-process frontend tests: **13 passed**. `npm run lint`: passed. Backend `pytest`: **42 passed**. `npm run admin:build` could not complete because Vite's Windows safe-path process call returns `spawn EPERM` in this environment.
- Phase 6 remains incomplete until the revised role migration is rehearsed in isolated PostgreSQL 17, JWT/DB configuration and runtime grants are verified, first-admin bootstrap is reviewed, and protected editing/media workflows are implemented and tested. No database or production changes were made.

## Phase 7 — PYQ system

**Status:** Provenance-aware validation contracts implemented; no source-backed paper data or persistence/API exists yet.

- Added PYQ paper metadata and central-question mapping schemas plus deterministic publication and mode validation. Original section/order and marking values are explicit; question content/answers are not copied. Official simulation requires verified source, answer key and mappings, known duration, scoring, and preserved order. Practice can remain unscored while an answer key is under review.
- Repository search found no PYQ paper assets, verified metadata, or central mappings. The live 2026 row distribution is not evidence of a complete historical paper. The official archive lists challenge/model-solution artifacts but that listing alone does not establish a complete question paper; see `docs/pyq-ingestion.md`.
- No PYQ migration, route, imported content, public page, or simulation was added. Question ID type/revision mapping and Phase 6 role/database gates remain unresolved.
- Backend suite: **42 passed**; Python compilation passed; frontend suite (in-process): **13 passed**; `npm run lint`: passed.
- Phase 7 remains in progress pending source review, schema reconciliation, isolated PostgreSQL 17 migration testing, ingestion APIs, and official/practice end-to-end behavior.

### Phase 6/7 continuation (2026-11-01)

- Ran the linked Supabase catalog audit using SELECT-only queries. PostgreSQL 17.6, exact question constraints/indexes, Auth UUID type, and `questions_id_seq` settings are recorded in `docs/supabase-live-schema-audit-results.md`.
- Found broad production default ACLs on new tables/sequences created by `postgres` and `supabase_admin`. Updated only local migration drafts to revoke direct table access from `anon` and `authenticated`; added smoke assertions. Existing `questions`, Auth, Storage data, and policies were untouched.
- The revised SQL migrations could not be rehearsed here because no local PostgreSQL server, Docker, or Podman is installed. The earlier catalog rehearsal covered the previous draft only; it does not validate the new revokes.
- PYQ validation contracts and tests remain the available local deliverable. No verified PYQ paper/answer key was present, so ingestion, persistence, public browsing, and simulation remain pending rather than fabricated.
- Current gates: disposable PostgreSQL 17/Supabase environment, Auth/JWT and Storage configuration review, approved first-super-admin identity/bootstrap procedure, reconciled complete migration ledger, actual backend runtime role, and source-backed PYQ paper with verified answer key, order, and marking metadata.

## Phase 8 — Test engine

**Status:** Local backend authoring and attempt-flow slice implemented; migration and database integration remain unverified.

- Added `supabase/migrations/20261101020000_create_test_engine.sql` for tests, immutable versions/sections/question snapshots, attempts, answers, submissions, and scores. It references the verified `questions.id bigint` and `auth.users.id uuid`; enables RLS on ten new tables; creates no policies; revokes client table/function access; and includes immutability triggers for published version content.
- Added protected test draft/version/publish APIs. Editor+ can create drafts and version snapshots from published legacy question rows; administrator+ can publish after non-empty-section validation. Each operation writes an audit event in the same transaction and depends on the Phase 6 role/audit schema.
- Added student attempt APIs for transactional eligibility/attempt-limit checks, server-owned timestamps, persisted question/option order, safe session recovery, versioned answer autosave, navigation/review flags, manual/deadline submission, and idempotent scoring. Session payloads omit correct answer and explanation fields; submission receipts omit scores pending Phase 9 result-release rules.
- Lazy recovery auto-submits expired attempts when the student reconnects. A scheduled background expiry worker is not configured.
- Added domain and API tests for eligibility, schedule/ownership, remaining time, answer-key exclusion, stale writes, foreign question navigation, manual/automatic reason selection, weighted scoring, retry behavior, API auth, and safe errors.
- Verification before adding the catalog API: backend suite **59 passed**; Python compileall passed; ESLint passed with an ignore pattern for inaccessible pytest-generated temp directories. SQL migration rehearsal was not possible because this environment has no PostgreSQL server, Docker, or Podman. No migration or production data was changed.
- Added a signed-in test catalog and responsive student attempt UI with timer, autosave status, section/question navigator, review markers, submit confirmation, and recovery on reconnect. Added the authenticated, read-only published-test catalog API used by that UI.
- Frontend ESLint and backend Python compilation pass. Vite production build is currently blocked before app compilation because the installed Tailwind Windows native binding cannot be loaded (`spawn EPERM` / missing `@tailwindcss/oxide-win32-x64-msvc` binary); dependency repair or a working build environment is needed to verify a production bundle.
- Remaining gates: PostgreSQL 17/Supabase rehearsal, failure/rollback and real concurrency tests, actual runtime-role grants, scheduled expiry processing, and audited admin test-builder UI. Phase 8 remains in progress.

## Phase 9 — Results and analytics

**Status:** Local release-aware results and personal analytics slice implemented; database integration remains gated on the Phase 8 isolated migration rehearsal.

- Added validated version policy: results release after submission or at a timezone-aware configured time; answer review follows results, releases at its own configured time, or stays hidden. Defaults are after-submit results and review with results.
- Added owner-scoped result and answer-review endpoints. Result payloads include section breakdowns; review includes persisted question/option order, selected/correct choices, awarded marks, and explanations. Pre-release, missing, and foreign attempts share a not-found response.
- Added owner-only attempt history and personal aggregates. Unreleased scores are excluded from history and average/best percentages; no cross-student ranking or public profile is exposed.
- Added student result and attempt-history screens with score breakdowns and release-aware answer review. Leaderboards are deferred until opt-in preferences, privacy controls, and score normalization are implemented.
- Verification: frontend ESLint and Python compilation pass. No database integration test or database connection was run. Importing the FastAPI router is blocked because PyJWT is not installed in this environment; Vite build is blocked by the unavailable Tailwind Windows native binding.