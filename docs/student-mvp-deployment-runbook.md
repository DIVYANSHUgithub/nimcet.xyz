# Student MVP release — 17 November 2026

This is the current release guide. The earlier deployment-blockers report records
the findings before these fixes. The application has not been published by this work.

## What changed

- Backend production entry point binds to `0.0.0.0` and the host's `PORT`, without
  reload. It uses one worker, a bounded connection pool (3, no overflow), a
  concurrency ceiling of 64, and short database lock/query timeouts. Timeouts are
  transaction-local: a live test showed Supavisor ignored startup parameters.
- A certificate override makes `certs/supabase-ca.crt` work on Linux while allowing
  reuse of the existing database URL containing its old Windows certificate path.
  The driver is explicitly normalized to psycopg 3. TLS stays `verify-full`.
- Added a non-root Docker image, health check, pinned direct runtime dependencies,
  production environment templates and a read-only database preflight.
- Production startup rejects incomplete auth, local CORS, unverified database TLS,
  missing CA files, owner database logins, and feature flags outside this MVP scope.
- Vercel now runs `npm run build:deploy`: local/placeholder API URLs, missing public
  auth keys, service-role keys, and unavailable frontend features fail the build.
  Ordinary `npm run build` remains available for development preview.
- PYQ navigation/route and detailed analytics are disabled by default. Baseline
  test results/history remain available. These frontend gates are presentation
  controls; backend authorization and module flags still enforce access.
- Applied and verified internal event-trigger execution restrictions. Browser roles
  cannot read attempts directly or execute `rls_auto_enable`; its trigger remains enabled.
  At the owner's request, a follow-up migration restores the previous question
  SELECT grants, including answers and explanations, for every student. Published-row
  RLS remains enabled. Public question answers are intentional product behavior.
- Added a read-only hosted smoke-check script.

## Database status: reuse the existing hosted project

Project: `wcxxyyebcgofziylgwdg`. Deploying the frontend/backend does **not** require
copying the existing Supabase database. Point both services at this project.

Eight migrations are recorded live: catalog, trusted roles/audit, questions, test
engine, test-manager role, and these three follow-up migrations:

```
20261116191340_restrict_student_question_columns.sql
20261116192005_restrict_rls_trigger_execution.sql
20261116201153_restore_public_question_read_access.sql
```

Three older local migrations remain pending deliberately:

```
20261115205355_phase2_question_bank.sql
20261115215520_phase5_results_pyq.sql
20261115231354_admin_workflows.sql
```

Do not run an unreviewed `supabase db push` that applies those modules to remove
the migration gap. Keep the module flags below false. Before activating them later,
reconcile the migration order, rehearse the full sequence, provision runtime grants,
and preserve the owner-approved public question/answer access.

Questions, answers and explanations are intentionally available to every student.
This is not a deployment blocker and should not be restricted in future hardening.

## 1. Prepare the release in Git

Actual repository root:
`C:/Users/smish/OneDrive/Desktop/nimcet.xyz/app/nimcet.xyz`.

There are many existing modified and untracked files from development. Review the
release diff and include all imported source modules, package lockfiles, migrations,
the public CA file, Dockerfile and scripts. Commit/push the intended release to
the repository your host builds. No commit or push was made automatically.

Never add filled `.env` files, database passwords, Auth admin/service keys, `.venv`,
`node_modules`, or local audit outputs. The `.env.production.example` files contain
only templates; filled `.env.production` files remain ignored.

## 2. Deploy the API first

Use a Docker-capable backend host with outbound access to Supabase, HTTPS, restart
on failure and a scheduled-job facility. Use an always-running service for timed
tests; verify any sleep/cold-start behavior before choosing a hosting plan.

Build context: `backend`. Dockerfile: `backend/Dockerfile` from repository root,
or `Dockerfile` when the host root directory is `backend`.

Set host environment variables using `backend/.env.production.example`:

| Variable | Value |
| --- | --- |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | Existing dedicated `nimcet_backend` pooler URI from your ignored local backend `.env` |
| `DATABASE_SSL_ROOT_CERT` | `certs/supabase-ca.crt` |
| `DATABASE_POOL_SIZE` | `3` |
| `SUPABASE_URL`, `SUPABASE_JWT_*` | Exact values in the production template |
| `CORS_ALLOWED_ORIGINS` | Actual HTTPS frontend origin(s), comma-separated; no paths/trailing slashes |
| `TRUSTED_ROLE_LOOKUP_ENABLED` | `true` |
| `TEST_ENGINE_ENABLED` | `true` |
| `QUESTION_AUTHORING_ENABLED` | `false` |
| `PHASE5_ENABLED` | `false` |
| `ADMIN_WORKFLOWS_ENABLED` | `false` |

Keep `sslmode=verify-full` in the database URI. Supply the URI through the host's
secret environment field. The CA override replaces its Windows-specific path.
Do not paste this URI into frontend configuration or chat.

The host provides `PORT`; 8000 is the fallback. Start command is already in the image:

```sh
python scripts/serve.py
```

Run this once in the deployed backend's console/pre-deploy environment:

```sh
python scripts/check_deployment.py
```

It validates configuration, TLS, presence/read access of all 14 baseline tables,
and the grants needed to save/submit results. It changes no data. It does not prove
every column, constraint, authorization rule or write flow; complete step 7 too.

Set the host health-check path to `/ready`. `/health` proves only the process is
alive; `/ready` also checks database/auth configuration, not full schema coverage.

Optional local container rehearsal, after starting Docker Desktop:

```sh
docker build -t nimcet-api:pilot ./backend
docker run --rm --env-file ./backend/.env.production -p 8000:8000 nimcet-api:pilot
```

The runtime role currently has a 12-connection limit. Begin with one API instance
and one worker. One scheduler process plus the API can use up to six configured
pool slots. Measure load and database usage before adding replicas/workers. The
concurrency cap is overload protection, not a per-user rate limiter: configure
the host/gateway's rate limits and request-size limits before a public launch,
ensuring answer autosaves remain usable. No external gateway rule was configured here.

## 3. Deploy the student frontend on Vercel

Root directory: `clientFront` relative to the actual Git root. Install with
`npm ci`; build with `npm run build:deploy`; output is `dist`. These build/output
settings are in `clientFront/vercel.json`, including SPA deep-link rewrites.
Use Node 22.12 or later supported by Vite 8 (Node 22 LTS is a suitable target).

Set these public build variables in Vercel using `clientFront/.env.production.example`:

```
VITE_SUPABASE_URL=https://wcxxyyebcgofziylgwdg.supabase.co
VITE_SUPABASE_ANON_KEY=<your project publishable key or existing anon key>
VITE_API_BASE_URL=https://<your deployed API hostname>/api/v1
VITE_QUESTION_API_MODE=backend
VITE_ENABLE_PYQ=false
VITE_ENABLE_DETAILED_ANALYTICS=false
```

Changing a Vite environment variable requires a new build/deployment. Never put
database credentials or secret/service-role keys in any `VITE_` variable. Do not
deploy `admin/adminFront` as part of this student MVP.

Once the frontend hostname is known, set that exact origin in API CORS and
redeploy/restart the API. Add both apex and www origins only if serving both.
No wildcard production CORS is needed.

## 4. Configure Supabase Auth for the real frontend URL

In Supabase Authentication URL Configuration:

- Site URL: the canonical HTTPS student frontend URL.
- Redirect allowlist: that origin's `/login`, `/reset-password`, and `/questions`
  (the last is used if social login is enabled).
- Keep localhost redirects only if still needed for development.

Configure a real SMTP provider and verified sending domain for confirmation and
password-reset messages. Test delivery to an ordinary student email address outside
the Supabase organization. The default Supabase SMTP service is restricted and
is not a production email-delivery solution:
https://supabase.com/docs/guides/auth/auth-smtp

Enable leaked-password protection if available on your project plan:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

This work did not change hosted Auth redirects, SMTP credentials, DNS, or plan settings.

## 5. Schedule expired-attempt finalization

Use the same backend image/environment in the host scheduler, initially every minute.
First inspect a dry run:

```sh
python scripts/finalize_expired_attempts.py --limit 50
```

Then schedule:

```sh
python scripts/finalize_expired_attempts.py --apply --limit 50
```

Monitor failed exit codes and overdue-attempt backlog. Increase sweep capacity only
after observing load. This ensures attempts finish even when a student closes the
browser. No hosted scheduled job was created here.

## 6. Run the hosted read-only smoke check

From `clientFront`, substitute both actual URLs:

```sh
node scripts/smoke-deployment.mjs https://<api-host>/api/v1 https://<frontend-host>
```

Checks: process health, readiness, question browsing,
authentication required for tests, and exact frontend CORS. Then directly open
and refresh `/tests`, `/results`, and an owned attempt URL on the frontend to
verify SPA hosting. This script does not create student attempts.

## 7. Complete one hosted student acceptance test

Use a normal student account and a fresh attempt. Verify:

1. Signup email, confirmation, login, logout, forgotten-password email and reset.
2. Open a test, select A, wait for saved state, change to B, refresh: B persists.
3. Clear the answer, refresh: unanswered persists. Reselect and navigate/review.
4. Disconnect/reconnect briefly without closing the page: failed saves show a
   warning and synchronize after reconnect. Do not close with unsaved work: pending
   edits currently live in memory, without durable offline storage.
5. Submit while a save is pending: saves finish first, then submission. Double
   clicking must not duplicate attempts/submissions. Submitted answers stay locked.
6. Verify +4 correct, -1 wrong, 0 blank on the current two-question practice test.
   One correct and one wrong should yield 3/8 (37.5%).
7. Start another attempt, close the browser and let it expire; check the scheduler
   finalized it without extending the server deadline.
8. A second student cannot open the first student's attempt/result. Exhaust the
   configured attempt limit and confirm another start is rejected.
9. Repeat the essential flow on a phone and confirm controls remain usable.

## 8. Open the pilot and monitor

Enable platform uptime/error alerts, scheduled-job failure alerts and database
connection monitoring. Verify a backup/restore path for the existing Supabase plan;
take an operator backup before any later schema activation. Keep the previous
frontend/backend release available for rollback. Roll back application releases
first; do not undo student submissions or drop tables to roll back code.

Only two questions are currently published. Add and review enough content for the
intended pilot, ensuring each stored answer matches its explanation. Defer admin
completion, PYQ, rich media, bookmarks and detailed analytics to later releases.

## Validation and limits

Automated checks and live permission/TLS checks are recorded in
[release verification notes](student-mvp-release-verification-2026-11-17.md).
Container execution and real hosted email/DNS/CORS/
student acceptance remain external checks. The local Docker engine was unavailable.
Do not interpret a successful normal development build as proof that production
environment variables or external services are configured.
