# NIMCET.XYZ API foundation

This FastAPI backend includes the existing question API and locally implemented question/media authoring, test snapshots and approvals, private attempts/results, PYQ verification, and administrative operations. Write workflows are feature-gated and require their reviewed schema, grants and configuration. The read-only legacy question endpoints continue to use explicit read-only transactions.

## Local setup

Use Python 3.11 or newer. From the repository root:

```powershell
py -3 -m venv backend\.venv
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
Set-Location backend
.\.venv\Scripts\python -m uvicorn app.main:app --reload
```

The copy step creates an ignored local secret/config file. Fill JWT verification values only after confirming the hosted Auth signing mode and claims. `SUPABASE_JWT_MODE=jwks` uses an asymmetric public JWKS URL and explicit algorithm. `SUPABASE_JWT_MODE=hs256` requires the legacy signing secret in a server-only secret store. Do not put either secret in frontend `VITE_*` variables. Issuer and audience have no assumed defaults.

The owner selected the Supabase direct Postgres connection for backend integration. Configure `DATABASE_URL` from the project's **Connect** panel using a dedicated least-privilege login role, TLS, and the matching project endpoint; keep the URI in the ignored local `.env` or deployment secret manager. Supabase documents direct connections at `db.<project-ref>.supabase.co:5432`; direct access requires IPv6 unless the project has IPv4 connectivity enabled. For certificate and hostname verification, Supabase recommends `sslmode=verify-full` with the project's CA certificate. See [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres) and [Postgres SSL modes](https://supabase.com/docs/guides/platform/ssl-enforcement). Do not use the database owner or a service-role key as an authorization substitute. `GET /health` works without dependencies; `GET /ready` returns 503 until database and Auth verification config are ready.

Trusted database role lookup and the test engine are opt-in (`TRUSTED_ROLE_LOOKUP_ENABLED=false`, `TEST_ENGINE_ENABLED=false` by default). Test-authoring, attempt, result, review, and analytics routes exist in code but are not exposed while the test-engine flag is off. Enable them only after the intended Supabase project is reconciled, the role bootstrap and test schema are verified there, and the backend runtime database grants have been checked. Do not turn them on just to hide a missing API route or database configuration.

## API foundation

- `GET /health`: process liveness.
- `GET /ready`: dependency readiness, without connection details.
- `GET /api/v1/auth/me`: verified Supabase user subject and safe role list.
- `GET /api/v1/questions`: filtered, page-based published question listing.
- `GET /api/v1/questions/facets`: published subject/topic labels.
- `GET /api/v1/questions/{question_id}`: published question detail.
- `/docs`: generated OpenAPI reference.

The question list/detail response preserves the legacy practice projection, including answer and explanation fields already publicly exposed by the existing policy. These endpoints are not suitable for active test sessions; those require a separate safe projection without answer keys. Database failures return a generic 503, and the repository explicitly marks its PostgreSQL transactions read-only.

All business errors use an `{ "error": { "code", "message", "request_id" } }` envelope. Request IDs are returned in `X-Request-ID`. Logs omit headers, query strings, bodies, tokens, connection strings, and raw exceptions.

With trusted role lookup disabled, authenticated users receive only the `student` role. When enabled, roles come from the trusted database table; the backend ignores token `role` and user metadata for app-level authorization.

## Run checks

From `backend/`:

```powershell
.\.venv\Scripts\python -m pytest
```

The tests use generated local tokens and SQLite `SELECT 1`; they do not contact Supabase or alter production data.


## Administrative workflows

`ADMIN_WORKFLOWS_ENABLED=false` is the default. When enabled, trusted database role lookup is mandatory; `/ready` and authenticated requests fail closed if it is disabled. The migration draft `20261115231354_admin_workflows.sql` depends on the Phase 2 and Phase 5 migrations. Review it and the exact runtime grants before any owner-approved activation.

The server-only `SUPABASE_ADMIN_KEY` is used solely for Supabase Auth Admin user listing and lookup. It is not the database connection, a frontend variable or a substitute for application role checks. Directory responses contain only UUID, display name, email, verification and basic account timestamps, plus trusted application roles/status. No password hashes, tokens or arbitrary metadata are returned.

See `docs/admin-development-2026-11-16.md` for endpoints, permissions, workflow transitions, test evidence and staging gates. No production migration or privileged role operation ran as part of this local development.
