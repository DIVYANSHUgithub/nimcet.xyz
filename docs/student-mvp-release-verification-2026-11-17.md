# Release preparation verification — 17 November 2026

## Passed

- Backend full regression suite: 163 passed after pooler timeout and production
  startup changes. A subsequent safe-error-handling change was checked with all
  five deployment tests, including one additional invalid-URI case.
- Frontend unit tests: 29 passed.
- Actual React attempt workflow harness: 23 passed, including answer changes,
  clearing, refresh, failed-save recovery and submission/save ordering.
- Component integration checks passed after updating the default navigation
  expectation to hide inactive PYQ functionality.
- Frontend lint and normal Vite production build passed.
- Frontend production preflight correctly rejects the current local API URL and
  local Supabase question mode. Hosted environment values still need to be supplied.
- Read-only live database check confirmed portable CA override, explicit psycopg 3
  and transaction-local 8-second statement / 3-second lock timeouts.
- Read-only production preflight, using a synthetic public CORS origin for config
  validation and the existing database credentials, confirmed all 14 baseline
  tables and runtime write grants. It did not test a deployed public origin.
- Follow-up owner request: restored and verified `anon`/`authenticated` question
  SELECT access including answer keys and explanations. Public answers are intentional.
  Question writes and direct attempt reads remain denied; published-row RLS is unchanged.
- Live SQL confirmed public execution of `rls_auto_enable()` denied for those
  roles while its event trigger remains enabled. The function is an internal
  event trigger; revoking API execution does not change its definition or owner.
- Local hardening and restoration migration filenames match the hosted ledger.
- Hosted smoke script passes syntax checking. Git diff whitespace check passed.

## Not claimed as verified

- Docker image build/start: local Docker Linux engine was not running.
- A fresh Linux dependency installation or complete clean-checkout container test.
- Public DNS/HTTPS routing, real deployed CORS and SPA refresh behavior.
- Supabase production Auth redirect settings, SMTP delivery, or leaked-password
  protection activation. The security advisor reported password protection disabled.
- Hosted cron configuration, uptime/error alerts, gateway rate limits or backups.
- Real hosted student acceptance flow, phone browser and cross-student isolation.

Supabase also reported RLS enabled without policies on five unused catalog tables.
This denies access; those tables are outside the baseline student question flow.
Do not add broad public policies merely to clear an informational advisory.

See [the deployment runbook](student-mvp-deployment-runbook.md) for external steps.
