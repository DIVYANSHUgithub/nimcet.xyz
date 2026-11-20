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

**Status:** Design package and current-catalog reconciliation complete; production schema changes and runtime integration remain gated.

- Defined student/admin/backend/database ownership, FastAPI domain boundaries, JWT and role verification, database access strategy, API error/pagination conventions, and rollout sequence in `docs/architecture.md`.
- Specified a versioned rich-content contract with stable option IDs, a legacy adapter plan, immutable question/test revisions, media asset lifecycle, test/attempt/result transactions, and a role/ownership matrix.
- Proposed normalized catalog, question revision, media, role, test/PYQ, attempt/answer/result, bookmark/collection/report, and audit entities in `docs/database-schema.md`.
- Specified versioned API groups, endpoint methods, auth roles, key request/response behavior, idempotency, and the answer-key-safe active session projection in `docs/api-reference.md`.
- No source code, database schema, migrations, policies, or APIs were changed. No tests were run; this phase produced design artifacts only.
- **Reconciliation:** the 2026-11-06 read-only catalog review verified the deployed taxonomy and key types and documented compatibility decisions in `docs/phase-1-schema-reconciliation-2026-11-06.md`.
- **Unresolved gates:** compare exact live policy/view definitions to migrations; configure and verify the direct DB endpoint, TLS, and least-privilege runtime role; approve the catalog label mapping before data/write-path work. Production DDL or authorization changes require their own concrete review and approval.

### Phase 1 exit status

The architecture, schema proposal, API contract, and taxonomy compatibility map are reviewable against current live catalog metadata. Phase 1 is complete for design reconciliation. Isolated backend scaffolding can proceed; database integration, migration work, security remediation, and production-targeting work remain gated as listed in the reconciliation report.

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

**Status:** Read-only project, migration-ledger, and Storage inventory complete; Auth dashboard review and backend database runtime verification remain open.

- The owner verified Supabase CLI authentication and that the NIMCET.XYZ project is linked.
- Recorded the supplied live findings in `docs/supabase-live-schema-audit-results.md`: PostgreSQL 17.6; the `public.questions` table and sequence; 15 columns; listed constraints/indexes; RLS/policy/grant/role findings; function, event trigger, extensions, migration metadata, and question counts.
- The section distribution in `docs/audit-results/questions-distribution.json` agrees with the 102-question audit total.
- The 2026-11-06 read-only recheck confirms project status/region/PostgreSQL version and all four migration versions; the bucket metadata and object count are recorded in `docs/phase-1-5-supabase-audit-2026-11-06.md`.
- Auth provider/redirect/signing settings are not exposed by the connected read-only tools. Backend direct DB runtime connection remains unverified because the ignored local URL has a placeholder password, targets the wrong host, and lacks explicit TLS.
- `docs/supabase-live-schema-audit.md` retains the earlier anon/API-only baseline and should be read together with the newer live result report; the new report is the current catalog finding record.
- No production object, record, grant, policy, Storage setting, Auth setting, or migration history was changed by this audit reporting work.

### Phase 1.5 exit status

Migration-ledger and Storage inventory are complete for this audit. Auth dashboard review and direct database runtime role/TLS verification remain open. No production changes were made.

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

## 2026-11-04 trusted-role production preflight

- Hardened the owner-operated bootstrap command to require a project ref matching both the Auth URL and direct/pooler DB endpoint, require TLS and an RLS-bypass server operator with table privileges, and reject any historical super-admin assignment/bootstrap event. The assignment and audit insert remain transactional.
- Rehearsed all four local migration files in order on a fresh, network-isolated Docker PostgreSQL 17.6 database. Catalog, trusted-role, question-RLS, and test-engine smoke SQL all passed. The bootstrap database harness passed absent-user refusal, audit rollback, assignment/audit atomicity, repeat refusal, and non-operator refusal. Auth Admin response and UUID confirmation behavior were mock-checked.
- A read-only linked production check found the standard migration ledger and all four versions recorded applied. The role/audit table columns match the local migration; RLS is enabled, policies are absent on those three tables, and anon/authenticated have no direct SELECT/INSERT. Current DB connection role is `postgres`, owner with RLS bypass; deployed FastAPI role remains unknown.
- The owner-specified Auth UUID is absent from `auth.users` (one user exists), and `public.questions` has one row versus 102 in the 2026-11-01 audit. Four published-read policies and a `security_invoker` view exist beyond the local Phase 8 migration. These conditions require owner reconciliation before bootstrap or further production changes. No production SQL was issued; local `TRUSTED_ROLE_LOOKUP_ENABLED` remains false.

## 2026-11-05 Phase 0 re-audit and verification

- Re-inspected the current repository and the supplied Supabase project read-only. The project is active in `ap-south-1` on PostgreSQL 17.11; all four local migration versions appear in the live ledger. No production database, Auth, Storage, or application data was changed.
- Confirmed 19 public tables with RLS enabled; 14 have no policies and no direct anon/authenticated table privileges. The live question policy allows public reads of complete published rows, including answer fields. Four additional published-test policies and the `security_invoker` `public_test_questions` view are absent from local migrations.
- Rechecked `ensure_rls`: it is enabled (`O`) for public table creation events and invokes `public.rls_auto_enable()`, which sets RLS but does not create policies. This differs from the older audit note that described the event trigger as disabled. The helper is `SECURITY DEFINER` and executable by anon/authenticated; it was not modified.
- Confirmed one live question, one test, zero attempts, four role codes, zero role assignments, one public media bucket, and zero Storage objects. Question content and object names were not read. The known one-question state remains treated as intentional.
- Effective backend flags are `TEST_ENGINE_ENABLED=false` and `TRUSTED_ROLE_LOOKUP_ENABLED=false`. Frontend and backend Supabase URL settings match the supplied project. A backend `DATABASE_URL` is configured, but its host does not match the project's standard direct or pooler hostname patterns and its grants/TLS behavior are unverified; it was not used for a live query.
- Validation: student `npm test` passed (17 tests), ESLint passed, student `npm run build` passed, and admin `npm run build` passed. The student package's admin wrapper initially failed because it referenced a nonexistent config path; that script was corrected and `npm run admin:build` then passed. Backend pytest collected 61 tests but stalled starting its first FastAPI `TestClient`; the faulthandler trace stopped in the Python 3.13 Windows Proactor self-pipe `socketpair()` accept, before the app route ran. No E2E or live database integration test ran.
- Fixed the question detail practice flow so answer/explanation render only after an option is selected; added unit coverage for correct, incorrect, missing-key, and invalid selections. Made username optional to match the approved registration fields of required student name and email. Fixed the admin build/dev wrapper, added the admin `.env.example`, replaced the generic admin README, added the current audit report, and marked the 2026-11-01 architecture audit as historical. See `docs/phase-0-audit-2026-11-05.md` for findings and priorities.
- Next gates: verify the backend DB endpoint/role/TLS against an approved non-production target, investigate the Windows `TestClient` stall, resolve question answer-key boundaries and schema drift, and keep production security changes and role bootstrap behind explicit owner approval.
- Owner clarification received: Supabase direct connection is the intended backend endpoint. The existing local `DATABASE_URL` was not changed because its secret is configured for a different, unverified remote host. `backend/README.md` and `.env.example` now describe the direct-connection setup without exposing credentials.

## 2026-11-06 database configuration and bootstrap preflight

- Rechecked local configuration without printing values. The JWT issuer/JWKS/mode/algorithm match the supplied project, but the ignored backend `.env` database URI still does not target the expected direct endpoint, contains a placeholder password, and has no explicit TLS mode. No database connection was attempted through it.
- Read-only Supabase preflight verified the supplied Auth UUID exists, the application role code exists, and there is no super-administrator assignment history or prior bootstrap audit event. No role assignment was made.
- The supplied settings mix runtime configuration and one-time bootstrap configuration. `backend/.env` `DATABASE_URL` must use a least-privilege runtime role. `bootstrap_first_super_admin.py` requires separate process-only `BOOTSTRAP_DATABASE_URL`, `BOOTSTRAP_SUPABASE_URL`, and `BOOTSTRAP_EXPECTED_PROJECT_REF`; its `BOOTSTRAP_OWNER_ROLE` must name the PostgreSQL operator (not the app role `super_administrator`). See `docs/first-super-admin-bootstrap.md`.
- The pasted `[password]` is a placeholder, so connection and bootstrap remain unverified. Do not execute the bootstrap until the exact operation has explicit owner approval, the secret is configured locally, and all script preconditions are satisfied.

## 2026-11-06 Phase 1 schema reconciliation

- Re-read the live public table inventory and migration ledger through the connected Supabase tools. Confirmed the deployed taxonomy is `examinations → subjects → chapters → topics`, with `sections` independently linked to examinations; catalog tables currently contain no rows. Confirmed `questions.id bigint` and legacy text `subject`/`topic` labels.
- Updated the target design to use `Subject → Topic → Subtopic` product vocabulary behind a compatibility mapping to existing `chapters`/`topics`. No deployed names, values, or IDs are changed; mapping approval is required before data migration or write-path work.
- Recorded the direct-connection selection while preserving the runtime configuration gate: the ignored local URI remains pointed at a different host, has a placeholder password, and lacks explicit TLS. It was not used.
- Added `docs/phase-1-schema-reconciliation-2026-11-06.md` and aligned `docs/architecture.md` and `docs/database-schema.md`. No production SQL or privileged role changes were made.
- Phase 1 is complete for design reconciliation. Exact live policy/view reconciliation, runtime DB verification, security changes, migration authoring, and first-owner bootstrap remain separate gated work.

## 2026-11-06 Phase 1 security/configuration validation

- The requested redacted runtime DB check found the loaded backend URI still targets a different Supabase hostname and lacks explicit TLS verification settings. The stored endpoint failed DNS resolution. A separate read-only strict-TLS attempt targeted only the supplied project host, kept the password in memory, and failed certificate verification before database authentication; no credentials or host were printed.
- The configured DB username is the project owner-level operator role (name redacted). Live role metadata shows that role has RLS bypass, database/role creation, and SELECT/INSERT/UPDATE/DELETE on all 19 public tables. The backend runtime credential is not least privilege; a successful session identity remains unconfirmed.
- The configured JWKS endpoint passed HTTPS certificate validation and returned one ES256-compatible P-256 key. Local issuer/JWKS/audience/mode/algorithm settings match the project. JWKS-mode code does not depend on `SUPABASE_JWT_SECRET`; real-token end-to-end verification remains blocked because no access token was supplied.
- Student and admin frontend environment settings match the project; configured URL/key values are present in their build bundles, and both production builds passed.
- Bootstrap was not executed. The current bootstrap process lacks the separate process-only required variables; the only bootstrap value in `backend/.env` does not match the required PostgreSQL operator role.
- Read-only live metadata confirms RLS is enabled on all 19 public tables. Anon/authenticated have no direct table grants on seven student/role data tables, while both can select `correct_option` and `explanation` from published rows in `questions`. The safe `public_test_questions` view does not prevent direct base-table reads. Four extra live published-test policies and the view remain outside local migration history.
- Changed only local feature-flag safeguards: `TRUSTED_ROLE_LOOKUP_ENABLED=false` and `TEST_ENGINE_ENABLED=false` in ignored backend config and source defaults. No production permission, policy, function, trigger, Auth setting, or data was changed.
- Backend pytest collected 61 tests but blocked at the first `TestClient` request. A minimal FastAPI app reproduces the issue before routing; the stack hangs while Python 3.13.5 on Windows initializes a Proactor loop through `socket.socketpair()` fallback `accept()`. Twenty-four domain/repository tests, three role-resolver tests, two JWKS tests, and both frontend production builds passed. Full details/statuses are in `docs/phase-1-security-validation-2026-11-06.md`.

## 2026-11-06 Phase 1 security retest

- The current DB URI now identifies the supplied project's pooler endpoint. A strict `verify-full` connection attempt still fails certificate verification before database authentication; no connection using weaker TLS was attempted.
- The pooler login maps to the project owner-level PostgreSQL role, whose live metadata has RLS bypass, database/role creation privileges, and full read/write/delete grants on all 19 public tables. Runtime identity remains unconfirmed; the role is not acceptable for backend runtime use.
- Bootstrap still cannot run: its required process-only configuration is absent, and the dotenv owner-role value does not match the role mapped by the current pooler login. No bootstrap was executed.
- The full backend pytest suite again stalls before the admin route during Windows Proactor event-loop socketpair initialization; the 24 domain/repository, 3 role-resolver, and 2 JWKS tests pass in isolated runs.
- RLS/policy/grant metadata is unchanged: all 19 public tables have RLS; none force RLS; seven student/role tables have no anon/authenticated grants; the published question table still exposes answer/explanation columns; four extra test-read policies and a safe-column view remain outside local migration history.
- See `docs/phase-1-security-retest-2026-11-06.md` for the redacted status matrix. No production change was made; feature flags remain disabled.

## 2026-11-15 Phase 1 security retest

- The current DB URL now identifies the supplied project's pooler endpoint and DNS resolves. A strict `verify-full` attempt still fails certificate verification before database authentication, so connected project identity/current role remain unconfirmed.
- The pooler login maps to the project owner-level DB role; read-only metadata confirms RLS bypass, database/role creation, and full CRUD privileges across all 19 public tables. Do not use this login for backend runtime.
- Bootstrap remains unconfigured in the process environment and the dotenv owner-role value does not match the mapped DB role. It was not executed.
- The 61-test suite reproduces the same Windows Proactor `socket.socketpair()` stall before the admin route. Isolated suites pass 24 domain/repository, 3 role-resolver, and 2 JWKS tests.
- RLS and answer-key findings are unchanged. All 19 tables have RLS, none force it; seven student/role tables remain without anon/authenticated grants, while answer/explanation columns remain readable from published questions. Four extra test policies and the safe test view remain outside local migration history.
- Both feature flags remain disabled; no production state was changed. See `docs/phase-1-security-retest-2026-11-15.md`.


## Phase 2 development — 2026-11-16

Implemented the local question/catalog/media/practice and PYQ metadata work. See
[Phase 2 development handover](phase-2-development-2026-11-16.md) for current
contracts, schema changes, validation evidence and activation gates. This does
not supersede unresolved Phase 1 findings or authorize production rollout.


## Phase 5 development — 2026-11-16

Implemented local results/review/analytics improvements, validated year-wise PYQ
publication and delivery, rich historical snapshots and a bounded expiration
command. See [Phase 5 handover](phase-5-development-2026-11-16.md) for contracts,
124 backend / 22 JavaScript test results, migration rehearsal and activation
gates. This does not declare Phase 3/4 complete or authorize production changes.


## Phase 6 frontend integration — 2026-11-16

Implemented student routing/recovery, shared request timeouts/binary media,
responsive accessible admin tabs, test draft/version integration and React
runtime deduplication. See [Phase 6 handover](phase-6-development-2026-11-16.md).
125 backend tests and 28 JavaScript tests passed; component rendering, builds
and lint passed. Browser tooling initialization failed, so visual/end-to-end
acceptance remains pending. No production changes were made.


## Admin completion pass — 2026-11-16

The existing admin application now has the complete local editorial/test-review, safe user/status/primary-role, media, attempt/result-monitoring and audit workspace. The local migration adds frozen workflow states, active primary-role uniqueness, account status, media archival and trusted Student registration. See [the admin implementation report](admin-development-2026-11-16.md) for permissions, endpoint contracts and the precise verification/activation boundary.

159 backend tests, 28 JavaScript tests, both lints/builds, component-rendering assertions and two isolated PostgreSQL migration rehearsals passed. Real-browser QA, hosted-version/ACL rehearsal, concurrency tests and owner-approved activation remain pending. No production or privileged change was made during this pass.
