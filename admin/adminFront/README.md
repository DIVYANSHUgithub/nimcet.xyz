# NIMCET.XYZ Admin

The admin application is a separate Vite/React app. It signs in through the same Supabase Auth project as the student app and asks the FastAPI backend to verify roles before showing admin data.

## Local setup

From this directory, install dependencies with `npm install`, then copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL` — the existing Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` — the project's publishable anon key. This value is browser-visible; never use a service-role or secret key here.
- `VITE_API_BASE_URL` — the FastAPI `/api/v1` base URL.

Run `npm run dev` for local development and `npm run build` for a production build. From `clientFront/`, the equivalent commands are `npm run admin:dev` and `npm run admin:build`.

For local administration, point `VITE_API_BASE_URL` to `http://localhost:8000/api/v1` and allow the admin origin (typically `http://localhost:5174`) in the backend's `CORS_ALLOWED_ORIGINS`. Start the backend with the reload command in the backend README. If it was already running without `--reload-include .env`, restart it after changing backend environment settings. Reloading the browser alone does not reload FastAPI settings.

The existing app now includes role-aware Overview, Questions & catalog, Media, Test authoring, PYQ verification, Review queue, Users, Attempts & results, and Super Administrator Activity tools. Question Editors manage canonical question drafts/review, rich content, images, occurrences and catalogs. Test Managers prepare versions and submit them; Administrators review, approve/reject, publish, suspend/resume and archive tests. Only Super Administrators can replace trusted primary roles.

The backend checks every operation. Submitted and approved test snapshots are frozen; revising creates a new draft. User-status changes affect application API access rather than Supabase Auth sessions. Result monitoring and completed-attempt answer access are audited. Active attempts do not expose answer keys through the monitoring review endpoint.

## Backend activation

Local implementation is complete; production activation has not been performed. The admin workflow migration is `supabase/migrations/20261115231354_admin_workflows.sql`, after the question-content and Phase 5 migrations. Read `docs/admin-development-2026-11-16.md` for migration/grant checks and verification limits.

Required backend flags for the complete workspace are `TRUSTED_ROLE_LOOKUP_ENABLED`, `QUESTION_AUTHORING_ENABLED`, `TEST_ENGINE_ENABLED`, `PHASE5_ENABLED`, and `ADMIN_WORKFLOWS_ENABLED`. All default to false. Set the server-only `SUPABASE_ADMIN_KEY` for Users & roles. Image uploads and stored previews separately need `SUPABASE_STORAGE_KEY` and a private bucket named by `STORAGE_BUCKET`. Keep both credentials out of `VITE_*` variables.

Set `PAYMENTS_ENABLED=true` to use the Student Pass queues. A verified capture activates eligible passes automatically. Admins can review payment records, reconcile with Razorpay and approve full refunds. Reconciliation and refunds require Razorpay configuration. To keep checkout closed on the local backend during admin work, set `PAYMENTS_CHECKOUT_ENABLED=false`.

Directory browsing is paginated. UUID lookup searches the full directory; name/email/role/status filters apply to the current page and are labelled accordingly. Existing Auth users are preserved. The migration assigns Student only to newly registered users and performs no privileged bootstrap or existing-user backfill.

Production migration, Auth trigger installation, role changes and deployment require the owner's explicit approval under the supplied master engineering prompt. No credentials or existing environment settings were changed by this implementation.
