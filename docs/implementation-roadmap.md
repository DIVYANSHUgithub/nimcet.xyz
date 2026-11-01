# NIMCET.XYZ Implementation Roadmap

This plan follows the requested staged migration. Each phase must preserve the current student app and question records. A phase is complete only when its deliverables and required checks are recorded in `progress.md` and critical failures are resolved or tied to a documented external dependency.

## Phase 0 — Repository audit (complete)

- Inventory routes, auth, question data flow, dependencies, tests, deployment files, and migration/storage evidence.
- Record unverified live Supabase facts explicitly.
- Deliver `architecture-audit.md`, this roadmap, `progress.md`, and `known-issues.md`.
- No application behavior or database data changed.

## Phase 1 — Architecture and database design (design package complete; live audit partially reconciled)

- Obtain an export/read-only inventory of live tables, columns, types, defaults, constraints, indexes, RLS policies, Auth identity linkage, Storage buckets, and Storage policies.
- Compare the live state to the README-described `questions` schema and representative row values. Verify `correct_option` semantics and how options are encoded.
- Define domain boundaries, validated rich-content and option-ID contracts, role/ownership rules, API response/error/pagination contracts, media URL policy, and transaction boundaries.
- Design additive migrations, backfills, indexes, RLS changes, compatibility windows, and rollback/verification queries.
- Deliver `architecture.md`, `database-schema.md`, and `api-reference.md` before implementation. These documents now define the provisional contract; they are not executable DDL or evidence of current live schema.
- **Gate:** A first isolated additive catalog migration draft can be reviewed from the supplied audit. Question-referencing migrations and production baseline/application remain gated on exact sequence/constraint details, complete migration history, Auth/Storage findings, and a non-production rehearsal.

## Phase 1.5 — Configure and validate existing Supabase (read-only database audit received; Auth/Storage review outstanding)

- The owner verified Supabase CLI authentication and linking to the existing project. The supplied live audit verifies PostgreSQL 17.6 and the `public.questions` schema/policy/grant summary and row distribution; results are recorded in `supabase-live-schema-audit-results.md`.
- Existing Auth, Storage, security, RLS-test, and migration-plan documentation remains design/audit material. Auth JWT settings, Storage policies, detailed grants, and full migration history remain pending.
- **Gate:** Do not apply production migrations or change existing production policies. Local additive drafts may be prepared, but require complete migration-history reconciliation and isolated rehearsal before any deployment proposal.

## Phase 2 — Backend foundation (local foundation complete; hosted credentials pending)

- Add FastAPI modular monolith, settings and safe `.env.example`, Supabase JWT verification, trusted role lookup, database connectivity, structured errors/logging, `/api/v1` routing, health/readiness endpoints, and isolated pytest setup.
- Establish backend/frontend local developer instructions and ensure no service key enters browser builds.
- Verify backend starts and authentication rejects invalid/expired tokens.
- **Delivered locally:** modular FastAPI app, settings, explicit Supabase HS256/JWKS token verification modes, SQLAlchemy connection/readiness boundary, standard error envelopes, secret-safe JSON request logs, `/api/v1`, `/health`, `/ready`, `/api/v1/auth/me`, CORS, pytest setup, and backend README.
- **Security gate:** trusted role storage is not yet available in verified schema; until Phase 3, verified users receive only `student` and elevated authorization is unavailable. JWT mode/issuer/audience and DB URL remain unset until the hosted project settings and least-privilege connection are confirmed.
- **Verification:** 14 backend tests pass; local Uvicorn startup and health behavior were checked. Readiness correctly reports 503 without configured DB/Auth dependencies. No live Supabase token or database connection was tested.

## Phase 3 — Database migrations (catalog draft reviewed; production gate open)

- The local catalog migration creates examinations with separate exam sections and academic subjects, then subjects → chapters → topics. It has no forced section/subject mapping and no FK to legacy `questions.id`.
- `active`/`inactive` availability is inherited from every parent; student queries must filter every ancestor. FastAPI owns later `updated_at` updates; no timestamp triggers are used.
- PK/unique/check/FK constraints and required columns are covered by the draft. Composite unique indexes lead with each FK, so no duplicate FK indexes or speculative sort indexes are added.
- RLS is enabled on each new table with no policies or explicit grants. Actual Supabase default privileges and the production role matrix remain unverified.
- **Isolation check:** the migration and smoke test passed in disposable in-memory PostgreSQL 17.4. This is not Supabase's 17.6 patch or platform default ACL configuration.
- Remaining migrations require exact legacy ID/sequence facts before creating question FKs. Before deployment, reconcile migration history, verify PostgreSQL default ACLs and role grants, and rehearse with a disposable Supabase/PostgreSQL 17.6 environment. No migration has been applied to production.

## Phase 4 — Question Bank API and media (read-only legacy API slice implemented)

- Implemented published legacy question browse/detail, filters, facets, and pagination through FastAPI using explicit read-only PostgreSQL transactions; endpoint and repository SQL unit tests pass.
- The new routes are not yet connected to a verified live database, and no live-record integration test has been run. Phase 4 remains open until schema/role compatibility is confirmed and the API is verified against isolated data representing the live schema.
- Keep CRUD, rich question revisions, stable option IDs, question foreign keys, and backfills gated on complete migration history and verified legacy ID/sequence details.
- Keep media upload/retrieval/deletion gated on Storage inventory, policy, and bucket-limit verification.
- The Phase 5 frontend adapter has started behind a Supabase-default environment switch; cutover remains gated on live-compatible backend verification.

## Phase 5 — Student frontend integration

- Preserve current routes, brand, and Supabase Auth; add centralized API client with token forwarding, cancellation, error states, and environment URLs.
- **In progress:** existing student question pages and cards share the question API module. An environment-controlled backend adapter now supports question list/detail/facets while retaining the current Supabase adapter as the default rollback path.
- Validate the backend adapter against a configured non-production API before enabling `VITE_QUESTION_API_MODE=backend` in a deployment. Do not enable it until the backend database connection, CORS origin, published-question reads, and practice answer projection are verified.
- Migrate question reads gradually; use one shared rich-content renderer.
- Implement persisted bookmarks/collections and question reports once APIs are ready.
- Keep answer-key exposure intentional for practice pages and excluded from active-test payloads.

## Phase 6 — Admin application

- **In progress:** created a separate Vite/React admin app with Supabase sign-in, backend `/auth/me` role checks, a read-only question-count dashboard, and a super-administrator-only role assignment UI.
- Added a trusted-role resolver that is disabled by default, an opt-in database resolver that fails closed to student, audited role grant/revoke routes, self-change rejection, and a last-super-administrator guard. Added a local-only roles/audit migration draft with RLS, no policies, and explicit revokes for client privileges on its new tables/identity sequence.
- Linked catalog inspection verified `auth.users.id` is UUID and exposed broad `postgres`/`supabase_admin` default ACLs. The drafts now account for client table grants; the migration executor, backend runtime role, and revised SQL rehearsal remain unresolved. Keep `TRUSTED_ROLE_LOOKUP_ENABLED=false` until all gates and an owner-approved first-admin bootstrap are complete.
- Remaining work: question editor/revision/publish APIs, rich-content/media workflows, audit coverage for those future events, preview validation, backend database integration tests, and isolated end-to-end checks.
- Add student status/profile management only after a separate trusted workflow and privacy scope are defined. Elevated role assignment has a local audited route and UI, but remains disabled until its schema and first-admin bootstrap are approved.
- Provide previews and validation before publishing or bulk operations.

## Phase 7 — PYQ system

- **In progress:** added source-aware PYQ metadata/mapping schemas and pure publication/mode validators. They require verified source and order, keep IDs as strings until question/revision mapping is designed, and block scored use of unverified answer keys.
- No paper rows or mappings were added: the repo has no verified source files, and the 2026 legacy-question distribution is not proof of a complete prior-year paper. Official archive links and review steps are in `docs/pyq-ingestion.md`.
- Remaining work: verify and ingest licensed/source-backed paper data; reconcile legacy question/revision identity; add immutable paper/version schema, protected admin ingestion APIs and public browsing; implement original-order official simulation separately from practice; test scoring and answer release. Do not fabricate paper content or answer keys.

## Phase 8 — Test engine

- **In progress:** added local draft schema for test drafts/versions/sections/questions, attempts, answer state, submissions, and results. It enables RLS on every new table, adds no policies, revokes direct client privileges, snapshots legacy question content, and blocks edits to published test content.
- Added editor/admin test draft/version/publish routes with role gates and transactional audit events, plus student attempt start/recovery, answer CAS autosave, navigation/review state, deadline-aware submit, and idempotent scoring.
- Added signed-in published-test catalog and responsive timed attempt interface with question map, section filtering, server-synchronized countdown, serialized autosaves, recovery, review marking, submit confirmation, and keyboard navigation. Added an authenticated read-only catalog endpoint to supply safe test summaries.
- The active session projection omits correct answers and explanations. Attempts freeze question and option order, use PostgreSQL timestamps, and enforce owner, schedule, attempt limits, and deadline in the repository.
- Backend unit/API coverage tests eligibility, safe projection, answer conflicts, navigation, deadlines, scoring, and idempotent submission. The SQL draft and smoke assertions have not been run against PostgreSQL because no isolated PostgreSQL/Docker/Podman environment is installed here.
- Remaining: PostgreSQL 17 rehearsal and rollback test; Auth/role/runtime privilege validation; background expiry sweeper; results/review-release endpoint; audited test-builder UI; concurrency tests against PostgreSQL; migration-history reconciliation. Keep test feature disabled until the local migration is reviewed and applied only to a disposable project.

## Phase 9 — Results and analytics

- Add authoritative scoring from stored test rules and correct answers, section results, publication policy, attempt history, and student analytics.
- Add review/answer release policy and ensure unavailable results/keys cannot be fetched early.
- Implement leaderboards only with opt-in, privacy controls, and compatible score normalization.

## Phase 10 — Production hardening

- Review authorization, RLS, rate limits, CORS, storage policy, logging, errors, query plans, accessibility, responsiveness, and operational monitoring.
- Complete integration and end-to-end coverage with isolated test data.
- Document Vercel and Render build/runtime settings, secrets, health checks, migration order, recovery, and cutover.

## Phase 11 — Final verification

- Run backend unit/integration tests, frontend tests/lint/build, and supported end-to-end workflows.
- Verify routes and authentication, existing question preservation, rendering, ownership, no answer-key leakage during active tests, timer recovery, single evaluation, and migration rollback strategy.
- Publish a final implementation report with executed checks and unresolved external dependencies.

## Sequencing gates

1. Do not apply a production schema migration until complete deployed migration history, applicable default privileges, and the exact target role matrix are reconciled.
2. No test-engine frontend work before safe session/answer/submission API contracts exist.
3. No production migration or deployment cutover as part of local implementation without an explicit target and safeguards.
4. Existing student application remains available during incremental backend adoption.
