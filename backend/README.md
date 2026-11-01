# NIMCET.XYZ API foundation

This is the FastAPI foundation plus the Phase 4 read-only legacy question API. Question routes read the existing published `public.questions` rows in an explicit read-only transaction; they do not create or modify application data. Rich question revisions, writes, and media routes still wait for the schema, privilege, and Storage gates.

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

`DATABASE_URL` must be configured with a dedicated least-privilege database role and TLS for a hosted database; do not use a broad service-role credential as an authorization substitute. Keep the URI in the ignored local `.env` or deployment secret manager. `GET /health` works without dependencies; `GET /ready` returns 503 until database and Auth verification config are ready.

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

Until a trusted role table is introduced, authenticated users receive only the `student` role. The backend ignores token `role` and user metadata for app-level authorization; editor/admin capabilities remain unavailable.

## Run checks

From `backend/`:

```powershell
.\.venv\Scripts\python -m pytest
```

The tests use generated local tokens and SQLite `SELECT 1`; they do not contact Supabase or alter production data.
