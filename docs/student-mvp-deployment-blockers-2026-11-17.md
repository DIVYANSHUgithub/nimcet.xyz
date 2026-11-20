# Student MVP deployment blockers — 2026-11-17

Update: deployment code/configuration fixes and two narrow live security migrations
were subsequently completed. Use [the current release runbook](student-mvp-deployment-runbook.md)
for deployment instructions; the findings below describe the earlier audit state.

Scope: student launch only, excluding admin feature completion. This is a
read-only repository/configuration/live-metadata audit, not a deployment or
complete hosted acceptance test. Existing development changes were preserved.

## Suggested first-release scope

Question browsing and practice, student sign-up/sign-in/recovery, text/math timed
tests, answer changes/autosave/resume, manual/timer submission, personal results
and answer review. Hide PYQ papers, detailed performance summaries, bookmarks,
and rich-media workflows until their own data/schema/configuration is ready.

Existing local baseline flags: TRUSTED_ROLE_LOOKUP_ENABLED and TEST_ENGINE_ENABLED
are true; QUESTION_AUTHORING_ENABLED, PHASE5_ENABLED and ADMIN_WORKFLOWS_ENABLED
are false. Do not enable newer modules merely to remove an unavailable message.
Only the original four migrations and add_test_manager_role are recorded on the
hosted project. Three newer migrations remain local. The baseline student MVP
does not automatically require the entire admin migration stack.

## Release blockers and acceptance checks

1. Deployable release artifact and API wiring. Most source changes are still
   uncommitted and many imported modules are untracked. Review/checkpoint the
   intended release and build a clean checkout. Configure the frontend project
   root as clientFront relative to the actual Git root, with its dist output.
   Deploy the backend with backend as its working directory and an appropriate
   host/assigned port. The repository documents a local reload command, not a
   verified hosted process. A frontend-only deploy cannot serve its Python API.

2. Public API URL, HTTPS and CORS. The active local frontend points to
   http://localhost:8000/api/v1. CORS currently permits only localhost:5173 and
   localhost:5174. Supply the actual HTTPS API URL at frontend build time and
   permit the actual student origin in backend CORS. Vite statically embeds
   VITE_* values, so changing backend variables cannot repair a built frontend.
   Acceptance: public /ready succeeds and a student's authenticated browser
   preflight, catalog and autosave requests succeed from the real site origin.

3. Portable TLS and secrets. DATABASE_URL uses verify-full but its CA file points
   to an absolute Windows workspace path. Provision the public CA certificate in
   the deployment and configure its deployed path. backend/certs is currently
   untracked. Keep the working least-privilege runtime role and put database/JWT
   configuration in server secrets, never VITE_* variables. Acceptance: a clean
   deployed backend establishes verified TLS without local machine files.

4. Real-student Auth onboarding. Existing local login is verified, but hosted
   Site URL/redirects and confirmation/reset delivery to an unrelated student's
   email have not been verified here. Configure exact production redirects and
   test new signup, email confirmation, logout/login, recovery and expiry. Default
   Supabase SMTP has production restrictions; verify custom SMTP as appropriate.
   Do not infer onboarding success from an existing developer/admin login.

5. Question/answer access is intentional, per the owner's clarification. The previous
   SELECT grants have been restored so every student can access published questions,
   answers and explanations. Do not treat this as a deployment blocker or restrict
   it in future hardening. Personal attempt access remains separately protected.

6. Concurrency and timeout budgets. The runtime role has a connection limit of
   12. App database pools are not explicitly sized in Database; deployment worker
   counts multiply potential connections. The current session statement_timeout
   is 2 minutes and lock_timeout is 0, while the client times out after 20 seconds.
   Configure compatible pool/query/lock/request budgets and exercise concurrent
   saves and submission bursts against hosted-version PostgreSQL. Client save
   recovery was tested with synthetic failures, not a real multi-user load.
   Add minimal API abuse protection before unrestricted public exposure; no
   application-level limiter was found in this source audit. Provider-side
   controls were not inspected.

7. Expiry scheduling. finalize_expired_attempts.py exists, but no deployed
   schedule is demonstrated in the repository. Configure one bounded, monitored
   finalizer job using the deployed runtime environment. Test abandoned tabs,
   retries and overlapping executions without duplicate results. Zero overdue
   attempts were observed during this audit; that does not prove a worker runs.

8. Consistent student feature profile. The PYQ navigation is visible even though
   PHASE5_ENABLED is false. StudentResults mounts PerformanceSummary, which calls
   the phase-5 endpoint and presents an unavailable/retry state. Hide/defer these
   sections for the baseline MVP or fully activate and verify their dependencies.
   The .env example uses Supabase question mode while the source default is
   backend: choose one release mode explicitly and verify browse + practice in it.

9. Hosted acceptance and basic operation. Run a fresh student through the public
   domain on desktop and mobile: signup, browse, test start, change/clear answer,
   review flag, refresh/resume, disconnect/reconnect, manual/timer submission,
   score/review and attempts limit. Use a second identity to verify denied foreign
   reads and mutations. Test direct /attempts/... and /results refreshes on the
   deployed SPA; the existing Vercel rewrite is helpful but not hosted proof.
   Test a cold start against the client's 20-second timeout. Add error/health/job
   alerts, a database backup and a demonstrated recovery path before inviting
   students whose results must be retained.

## Product readiness, distinct from technical deployment

Only two published questions and two public tests currently exist. This can
support a small technical pilot, not a substantive NIMCET preparation library.
Agree the pilot size, publish enough reviewed content for that cohort, and check
answer keys and explanations before presenting broader syllabus coverage.

## Deferred without blocking the baseline MVP

Full admin console, editorial approval UX, verified historical paper ingestion,
rich-media authoring, leaderboards, bookmarks/collections, advanced analytics,
monetization and broad platform automation. Their required database/privacy
controls still apply whenever those features are actually activated.

## Suggested order

Freeze student release scope -> review/checkpoint code -> configure public API,
TLS/secrets and CORS -> verify real-student email Auth ->
hide disabled modules -> configure finalizer and resource budgets ->
hosted acceptance/load checks -> backup/monitoring -> limited student pilot.

References: Vite env variables https://vite.dev/guide/env-and-mode ; Supabase SMTP
https://supabase.com/docs/guides/auth/auth-smtp ; Supabase redirects
https://supabase.com/docs/guides/auth/redirect-urls . No hosted configuration was
changed during this audit.
