# Admin development — 2026-11-16

Status: local implementation and automated verification complete. Hosted activation and real-browser end-to-end verification remain pending.

## Implemented in the existing application

- Role-aware navigation in `admin/adminFront`: Overview, Questions & catalog, Media, Test authoring, PYQ verification, Review queue, Users, Attempts & results, and Super Administrator Activity. Panels retain their state when switching tabs; navigation supports keyboard movement and accessible tab relationships.
- Real backend counts for questions, review requests, tests, approved/published PYQ papers, active/overdue/completed attempts and finalized results. Recent activity shows the signed-in operator's actual events.
- Canonical question create/edit, rich content and mathematics, stable option IDs, answer keys, explanations, authenticated image previews, PYQ occurrences, revision conflict handling, preview, editorial draft/review/published/archive states, and search plus state/examination/subject filters. Administrators publish; other authors cannot publish through a forged payload.
- Catalog editing preserves parent relationships; media can be uploaded or reused. Archive/restore is audited, refuses referenced assets and never deletes an object. New question media references lock the media row while saving to serialize attachment against archival.
- Test drafts and saved versions load from the backend. Full snapshot previews show content, options and explanations. Revising creates a new draft from current published canonical questions, preserving per-question marks, section order, schedule, release policy, duration, limits and shuffle settings. Existing snapshots remain intact.
- Test Managers submit drafts. Administrators approve/reject with reasons and publish approved versions. Submitted drafts can be withdrawn. Responsible user IDs, feedback and states are visible. General review precedes PYQ source verification, and publication revalidates its source blueprint and digest.
- Administrators can rename, suspend/resume availability, and archive tests. Suspension prevents new starts; resume requires an already published version. Archiving preserves existing attempts/results and removes the test from authoring/new-attempt lists. Published snapshots are never rewritten by these actions.
- Paginated Auth user directory with safe account information, verification status and trusted application role/status; full-directory lookup by UUID; explicitly labelled name/email/role/access filters on the current page. No claim of full-directory free-text search is made.
- Only Super Administrators can replace primary roles. Changes use an expected prior role, a transaction, a shared advisory lock, one-active-role constraint, reason and audit event. Self-change, conflicting assignments, stale changes, last-owner removal and promotion of a suspended account into an Administrator role are blocked. Verified email is required for non-Student roles.
- Administrators can suspend/restore nonprivileged application accounts with optional timezone-aware expiration and a reason. Privileged accounts cannot be suspended through this student-support control. This checks backend API access on every authenticated request; it does not ban Supabase Auth accounts or revoke their JWTs.
- Attempt monitoring supports test/user/status filters and pagination. Monitoring reads are audited. Ending a still-active, non-overdue attempt preserves answers and creates no invented score; overdue attempts must use the expiration finalizer. Completed/terminated attempt review requires a reason, audits access, uses stored results and frozen snapshots, and refuses active-attempt answer-key access.
- Super Administrator audit history supports action/entity/actor filters and pagination. State fields are allowlisted; tokens, hashes and response content are never recorded in these administrative events.

## Backend and database changes

`backend/app/api/v1/routes/operations.py`, `schemas/operations.py`, `db/operations.py` and `services/auth_directory.py` implement the new admin contracts. Existing authoring, PYQ and media repositories integrate the feature flag; JWT verification and trusted role lookup run in the thread pool rather than blocking async request handling. The math component now uses a CommonJS-compatible import, verified through real component rendering and both app builds.

The CLI-created local migration draft is `supabase/migrations/20261115231354_admin_workflows.sql`. It follows the Phase 2 and Phase 5 drafts and adds:

- A fail-fast conflicting-role check and unique active primary-role index. It deliberately refuses ambiguous existing assignments rather than reconciling them silently.
- RLS-protected application account status and least-privilege conditional runtime grants.
- Test workflow metadata, actor references, revision checking and review/deadline indexes.
- Triggers freezing submitted/approved configuration and section/question content. Parent membership cannot be moved to bypass the freeze. Existing published-content immutability remains in force.
- Media archive metadata and column-scoped runtime update grants.
- A private-schema Auth registration trigger assigning only Student and recording a system audit event. It uses fixed `search_path`, fully qualified relations and revoked public execution. SECURITY DEFINER is confined to this Auth-insert trigger because the Auth service must write trusted roles without a browser JWT; it is not a user-callable privilege-assignment endpoint. Existing users and owner roles are not backfilled or bootstrapped.

No production SQL, migration, application-data write, Auth configuration, role assignment, dataset processing, deployment or secret rotation was performed by this development task. Existing uncommitted work was preserved.

## Configuration and activation gates

Defaults remain disabled. The full workspace needs reviewed database migrations/grants plus backend `TRUSTED_ROLE_LOOKUP_ENABLED`, `QUESTION_AUTHORING_ENABLED`, `TEST_ENGINE_ENABLED`, `PHASE5_ENABLED` and `ADMIN_WORKFLOWS_ENABLED`. If admin workflows are enabled without trusted role lookup, readiness and authenticated requests fail closed. These booleans alone do not prove schema or provider readiness.

`SUPABASE_ADMIN_KEY` is a server-only Supabase Auth Admin credential used for user listing/lookup. Directory responses project only UUID, display name, email, email verification, creation and last-sign-in timestamps. Display metadata never grants roles. Do not place this key in any frontend `VITE_*` variable. Other workflows continue independently when the directory credential is absent. Existing database, JWT, CORS and Storage settings are still required.

Before owner-approved activation:

1. Reconcile the target migration ledger and grants. Replay against a disposable environment matching the hosted PostgreSQL/Supabase version and default privileges. Run the target's database/security advisors after applying there.
2. Ensure the runtime role exists when conditional grants run. If it is created afterward, explicitly review/apply the equivalent grants/policies; the earlier `setup_runtime_role.py` covers only the original baseline and must not be treated as an admin-workflow provisioning script.
3. Verify the Auth-insert trigger with a disposable Auth signup, role assignment, audit append, and rollback/failure behavior. Preserve existing accounts and the owner's explicit bootstrap process.
4. Configure server secrets and feature flags only for the approved environment. Check the verified owner role, directory projection, suspension expiry, media access, cross-user result isolation and the expiration worker.
5. Perform browser end-to-end checks with separate Editor, Test Manager, Administrator, Super Administrator and Student identities; exercise mobile/keyboard layouts, reloads, stale review conflicts, publish/unpublish, student attempts and audited private-result review.
6. Production deployment, schema/trigger installation, Storage/Auth changes and privileged assignments require explicit owner approval under the supplied master prompt. No approval request or production action was inferred from a request to implement locally.

## Executed verification

- Backend: **159 tests passed**, including the new review state/permission/CAS, atomic role replacement, last-owner/self-change, suspension, directory projection, active-answer protection, stored-result review, publication approval, media reference and availability tests.
- JavaScript: **28 tests passed**.
- Student and admin ESLint: passed.
- Student and admin production builds: passed.
- Vite component integration: real navigation, protected loading/content, four-role tab matrix, initial operational panels and snapshot preview assertions passed. This is server rendering with synthetic identities, not a browser end-to-end test.
- Full isolated PostgreSQL migration replay and admin assertions passed: Student-only registration/audit, unique primary role, frozen review content/configuration, runtime status/media access, forbidden deletion and anonymous/authenticated direct-client denial. Phase 5 immutability/scoring rehearsal also passed with the new migration included.
- `git diff --check`: passed.

The isolated rehearsal uses `@electric-sql/pglite@0.5.16` / PostgreSQL 18.6, installed under ignored `backend/.tmp/bootstrap-rehearsal`. It does not contact Supabase. If rebuilding that ignored tool environment, install the exact dependency with `npm install --prefix backend/.tmp/bootstrap-rehearsal --no-save --package-lock=false @electric-sql/pglite@0.5.16`. Run `node backend/scripts/rehearse_admin.mjs` and `node backend/scripts/rehearse_phase5.mjs` from the repository root. PGlite does not replace a hosted PostgreSQL-version/ACL/Auth/Storage rehearsal or multi-connection concurrency tests.

The available computer-use runtime failed to initialize with a kernel-assets path error. Real-browser visual and end-to-end verification was therefore not executed. No browser success is claimed.
