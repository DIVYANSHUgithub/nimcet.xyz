# NIMCET.XYZ Phase 0 Audit

**Audit date:** 2026-11-05\
**Repository:** `main` (`origin/main`)\
**Supabase target:** `wcxxyyebcgofziylgwdg`\
**Scope:** repository inspection, local configuration validation without printing secret values, and read-only live Supabase inspection.

## Executive summary

The repository has grown well beyond the 2026-11-01 repository-only audit. It now contains a React/Vite student app, a separate admin app, a modular FastAPI backend, four database migrations, and implementations for question browsing, test authoring, test execution, and results. The question detail page now waits for a student choice before showing practice feedback. The student and admin frontends build, and the student unit tests and lint pass.

The platform is **not ready for production use**. The test and trusted-role features are disabled in the backend configuration. The backend's configured database URL does not match the Supabase project's standard direct or pooler hostname patterns, and its runtime grants and TLS behavior have not been verified. The backend test suite stalls on its first `TestClient` request. There is no end-to-end verification against an isolated database.

The live Supabase project is active in Mumbai on PostgreSQL 17.11. All four repository migrations appear in its migration ledger. Live drift remains: published-test policies and a public test-question view are absent from local migration files; the `ensure_rls` event trigger is enabled even though an older audit described it as disabled; and a public `SECURITY DEFINER` helper is executable by anon and authenticated roles. The live question SELECT policy exposes all columns of published questions, including answer keys, to public clients.

This audit did not alter Supabase, Auth, Storage, or application data. It did not read question content, enumerate Storage objects, import or process the original question dataset, bootstrap a privileged role, or deploy anything.

## 1. Existing architecture

- **Student frontend:** React 19 and Vite SPA in `clientFront/`. It includes home, question list/detail, sign-up, login, password reset, test catalogue, attempt, result, and personal results routes.
- **Admin frontend:** separate React/Vite SPA in `admin/adminFront/`. It signs in through Supabase Auth and uses backend role checks before showing a question-count dashboard and super-administrator role controls.
- **Backend:** FastAPI under `backend/app/`. It provides health/readiness, JWT verification, current-user and role checks, read-only question APIs, admin APIs, test authoring APIs, test-session APIs, result/review APIs, and personal analytics APIs.
- **Database:** Supabase PostgreSQL. Four local migrations cover catalog tables, trusted roles/audit, legacy questions, and the test engine. The student app still reads questions directly from Supabase unless its backend adapter is selected.
- **Media:** one public Storage bucket, `NIMCET-Media`; no objects or application upload workflow were found in the live metadata/code review.

## 2. Feature status

| Area | Classification | Evidence and remaining work |
|---|---|---|
| Student authentication | Implemented but incomplete | Supabase sign-up, sign-in, OAuth entry points, and password reset exist. The required email-confirmation setting could not be inspected with available project tools. Full name and email are required for password signup; username is now optional. No canonical profile table/default-role assignment workflow is present. |
| Authorization | Implemented but incomplete | Backend verifies JWTs and fails closed. `TRUSTED_ROLE_LOOKUP_ENABLED=false`; the role table has four codes and zero assignments. Owner-approved privileged bootstrap and verified runtime grants are outstanding. |
| Question bank | Implemented but incomplete | Legacy browse/detail, filters, facets, normalization, and math/media rendering exist. Question detail now collects an option before showing correctness and explanation. Student reads default to Supabase; question CRUD, canonical revisions, structured rich content, answer-key server-side protection, and editor workflows are missing. |
| Catalog | Implemented but incomplete | Database has examinations, sections, subjects, chapters, and topics. No catalog management API/UI exists. Current schema says subject → chapter → topic, while the approved product hierarchy says subject → topic → subtopic; do not rename applied schema history. Design an additive reconciliation. |
| Test authoring | Implemented but incomplete | Backend draft/version/publish APIs and role gates exist. There is no usable test-builder UI, and authorization cannot be exercised while trusted-role lookup is disabled. |
| Test execution | Implemented but incomplete | Backend start/recovery, safe session projection, answer persistence, navigation, deadlines, submission, and idempotent scoring are implemented; student screens exist. `TEST_ENGINE_ENABLED=false`, database access is unverified, and no isolated PostgreSQL or end-to-end workflow was run. |
| Results and analytics | Implemented but incomplete | Result/review routes, release-policy logic, attempt history, analytics, and student screens exist. They remain unverified against a running backend/database and disabled with the test engine. |
| PYQ | Missing for MVP workflows | Pure validation/schema design exists, but no paper records, APIs, admin workflow, or individual/year-wise student experiences exist. No question records were altered. |
| Admin application | Implemented but incomplete | Fail-closed role gate, dashboard, role controls, and redacted audit view exist. Question/catalog/PYQ authoring, media, publishing, user management, and test-builder workflows are missing. |
| Reliability and operations | Missing or blocked | No scheduled attempt-expiration worker was found. Hosted deployment, database role/grants, live Auth verification, monitoring, rollback, and end-to-end testing remain unverified. |

## 3. Live database and security findings

### Verified state

- Project status is `ACTIVE_HEALTHY`, region `ap-south-1`, PostgreSQL `17.11.0.011`.
- The live migration ledger contains the same four versions/names as `supabase/migrations/`.
- The public schema has 19 application tables. RLS is enabled on all 19.
- Fourteen tables have no policies. Those tables also have no direct anon/authenticated table privileges in the inspected grant checks, so the absence of policies alone does not establish public exposure.
- The live `questions` policy permits anon and authenticated SELECT where `status = 'published'`. The table grants SELECT to both roles. The frontend and question API select complete question rows, including `correct_option` and `explanation`. The detail page hides the answer visually until a choice is made, but the key remains in the browser payload and direct Data API; this UI behavior is not a security boundary.
- Four additional SELECT policies exist on `tests`, `test_versions`, `test_sections`, and `test_questions`, but are not defined in local migrations. Direct anon/authenticated privileges on the underlying test tables were absent in the inspected grant checks.
- `public_test_questions` exists as a `security_invoker=true` view. Its projection includes question text and options while omitting correct-option and explanation fields. The underlying table grants still need verification through the intended runtime role before relying on this view.
- `public.rls_auto_enable()` is `SECURITY DEFINER`, has `search_path=pg_catalog`, and is executable by anon and authenticated roles. The enabled `ensure_rls` event trigger (`evtenabled='O'`) runs on public `CREATE TABLE`, `CREATE TABLE AS`, and `SELECT INTO`; its function body enables RLS on newly created public tables but does not create policies. This contradicts the older note that the event trigger was disabled. Do not modify it without owner approval.
- Security advisors report 14 RLS-enabled tables without policies, the publicly executable definer function, and disabled leaked-password protection. These findings need review in the context of grants and the approved Auth configuration. See [RLS policy lint guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [definer function lint guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [leaked-password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Performance advisors report four unindexed foreign keys: `admin_audit_actor_user_id_fkey`, `section_results_test_section_id_fkey`, `tests_created_by_fkey`, and `user_roles_granted_by_fkey`. They also report nine unused indexes; do not remove indexes based on a short observation window.
- Storage contains one public bucket (`NIMCET-Media`) and zero objects. `storage.objects` has RLS enabled with no policies. Table grants exist for anon/authenticated/service_role, but no policies currently authorize object operations. Review whether future question media is meant to be publicly readable before using this bucket.
- The live metadata showed one question, one test, zero attempts, four role codes, and zero role assignments. The one-question state is treated as intentional per the owner instruction; no question content was read or reconciled against older counts.

### Drift and integration risks

- The migration ledger matches local filenames, but the live test policies and `public_test_questions` view are not represented in local migration definitions. The `production_schema.sql` export is incomplete for reconciling this live state.
- The backend settings report a configured `DATABASE_URL`, but its host does not match the target project's standard direct or pooler hostname patterns and it does not explicitly request `sslmode=require`. Its actual role, grants, target, and TLS behavior were not verified. The owner has confirmed Supabase direct connection as the intended backend target; the local secret-bearing URL was left untouched and no live API query was made through it.
- Local frontend/backend Supabase URL settings match the supplied project. Backend effective flags are `TEST_ENGINE_ENABLED=false` and `TRUSTED_ROLE_LOOKUP_ENABLED=false`; JWT verifier configuration is present. The test runner used injected in-memory/fake dependencies and did not connect to the configured remote database.
- Public question reads expose the correct-option field before a learner answers. Active test sessions have a separate answer-free projection, but sharing the publicly readable question table means a timed test must not rely on those answer keys being secret without a reviewed access-boundary change.
- The live `NIMCET-Media` bucket is public; storage object policies and upload paths have not been implemented. Do not upload source content or change bucket settings as part of this audit.

## 4. Validation and repository changes

- Initial worktree was clean on `main` before audit changes.
- `clientFront`: `npm test` passed, 17 tests; `npm run lint` passed; `npm run build` passed.
- `admin/adminFront`: `npm run build` passed when run from that app directory.
- `clientFront/npm run admin:build` initially failed because the script pointed at nonexistent `clientFront/admin/vite.config.js`. The wrapper now delegates to the sibling admin app, and the corrected command passed.
- Backend: pytest collected 61 tests but stalled starting `test_admin_dashboard_requires_backend_role_before_reading_counts`, the first FastAPI `TestClient` request. A faulthandler trace stopped in Python's Windows Proactor event-loop self-pipe `socketpair()` accept, before the app route ran. The run was interrupted. This is not evidence of a live database failure; resolve the local Windows event-loop/socketpair issue before relying on backend regression coverage.
- No new Postgres migration rehearsal, API/database integration test, browser end-to-end test, security test, or deployment was run during this audit. The prior 2026-11-04 PostgreSQL 17.6 migration rehearsal is recorded in `docs/progress.md`; it does not validate the live policy drift or backend runtime connection.
- Local implementation: question detail now accepts an answer before showing correctness and explanation, with unit coverage for correct, incorrect, and invalid selections. The admin build/dev wrapper was corrected and the generic admin template README was replaced with project setup guidance. Documentation now points to this current audit and marks the 2026-11-01 architecture audit as historical.

## 5. Prioritized implementation plan

1. **Resolve high-risk production boundaries:** verify the backend database endpoint, role, grants, and TLS; review the public question answer-key boundary; inspect the provenance and intended access for the live test policies/view, definer function, and enabled RLS event trigger. Prepare a reconciliation report and reviewed additive changes. Obtain owner approval before any production RLS, grant, Auth, Storage, function, or trigger change.
2. **Create a safe database verification target:** rehearse local migrations on a disposable PostgreSQL 17 environment, compare the schema and ACLs with the live project, and add student A/student B ownership tests. Do not run tests or migrations against production.
3. **Unblock application configuration:** connect the backend to a verified least-privilege database role and approved Auth verifier; keep test and role flags off until checks pass. Confirm mandatory email verification in Auth settings.
4. **Finish the MVP workflows:** implement catalog management against the approved subject → topic → subtopic hierarchy, question authoring/revisions/media, test-builder UI, PYQ workflows, profile/default student role assignment, and question-wise result review.
5. **Reliability and release:** implement scheduled expiry, temporary network recovery checks, E2E coverage, monitoring, migration/rollback instructions, and deployment verification. Keep deferred features (bookmarks, reports, leaderboards, referrals, groups, WhatsApp, student-facing deletion) out of MVP.

## 6. Owner approvals and decisions

- Approve any production grant/RLS/Auth/Storage/function/event-trigger changes only after the above evidence and non-production rehearsal are reviewed.
- The owner has selected Supabase direct connection. Before integration testing, configure the ignored local `backend/.env` with the project's direct URI, a verified least-privilege login role, and TLS certificate/hostname verification. Do not send the password in chat or use the owner role as the runtime role.
- Confirm the design for answer withholding in practice versus active tests, given the public SELECT policy on legacy questions.
- Confirm the intended public/private access model for `NIMCET-Media` before creating upload policies or storing objects.
- Approve an initial Super Administrator assignment only through the documented bootstrap after verifying the intended Auth account; no assignment was made.

## 7. Readiness

**Not ready.** Existing frontend and backend code provides substantial development functionality, but feature gates, database endpoint/grant uncertainty, live policy drift, answer-key exposure, the backend test stall, and absent isolated end-to-end verification prevent a production-readiness claim.
