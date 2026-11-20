# Phase 1 Security Validation — 2026-11-06

**Scope:** redacted local configuration checks, read-only live Supabase metadata inspection, frontend production builds, and backend tests. No credentials, tokens, question rows, or Storage object names were printed/read. No production database or Supabase settings were changed.

## Validation results

| # | Check | Result | Redacted evidence |
| --- | --- | --- | --- |
| 1 | Runtime DB connectivity and target identity | **FAIL** | `backend/.env` is loaded, but its DB hostname does not match the supplied project's direct endpoint. The stored-endpoint attempt failed during DNS resolution. A separate read-only attempt to the explicitly supplied direct host, using configured credentials only in memory, stopped at TLS validation before PostgreSQL authentication. No database session identity or runtime role could be confirmed. Hosts and URL are omitted. |
| 2 | Effective runtime grants / least privilege | **FAIL** | The configured DB username is the project owner-level operator role (name redacted). Read-only live role metadata shows that role has RLS bypass, database/role creation, and SELECT/INSERT/UPDATE/DELETE on all 19 public tables. This is not a least-privilege runtime role. The actual session role remains unconfirmed because no DB connection completed. |
| 3 | TLS certificate and hostname validation | **FAIL** | The loaded DB URL has no explicit `sslmode` or root certificate. A strict `verify-full` attempt with the system CA store failed certificate verification, so neither a trusted certificate nor matching hostname was confirmed. |
| 4 | JWKS JWT authentication / legacy-secret dependency | **BLOCKED** | Local mode is JWKS with ES256 and project-matching issuer/JWKS settings. A read-only HTTPS fetch passed normal TLS validation and returned one ES256-compatible P-256 key. `SUPABASE_JWT_SECRET` is present, but the JWKS branch of `SupabaseTokenVerifier` does not require or read it. Two local JWKS unit tests passed. End-to-end verification of a real user access token was not attempted because no token was supplied; browser session credentials were not accessed. |
| 5 | Frontend Supabase initialization | **PASS** | Student and admin Vite environment files contain project-matching URLs and publishable/anon keys. The configured values are present in their respective built bundles, and both Vite production builds passed. Values are intentionally omitted. |
| 6 | Bootstrap configuration (no execution) | **FAIL** | The bootstrap script reads only process environment variables. In the checked process, all four required `BOOTSTRAP_*` variables were absent. `backend/.env` contains only `BOOTSTRAP_OWNER_ROLE`; its value does not match the expected owner-level operator role, and without the separate bootstrap DB URL it cannot be compared with the actual operator session role. The separate bootstrap URL/project variables are absent. The bootstrap command was not run. |
| 7 | Backend tests | **BLOCKED** | Pytest collected 61 tests. The full run passed the first three tests, then stalled at a FastAPI `TestClient` request. A minimal FastAPI app reproduces the stall before its route runs. The captured stack is blocked in Python 3.13.5 Windows Proactor event-loop initialization, in `socket.socketpair()`'s fallback `accept()`. Twenty-four non-API domain/repository tests, three role-resolver tests, and two JWKS tests passed. |
| 8 | RLS, student data isolation, answer keys, schema reconciliation | **FAIL overall** | RLS is enabled on all 19 public tables. The seven student data/role tables have no direct anon/authenticated table privileges; local SQL predicates also constrain attempt/result reads by the verified user ID. However anon/authenticated both have SELECT on `questions.correct_option` and `questions.explanation`, under a published-question read policy. The `public_test_questions` security-invoker view is granted to those roles and excludes those key columns, but it does not restrict direct reads from `questions`. Four live published-test policies and that view are not represented in the local test-engine migration. |

## Immediate local safeguard

Effective local values for `TRUSTED_ROLE_LOOKUP_ENABLED` and `TEST_ENGINE_ENABLED` were both `true`, contrary to the requested fail-closed state. Both values are now `false` in the ignored backend `.env`, and their defaults are `false` in `backend/app/core/config.py`. No production flags or data were changed.

## Security assessment

- **Student isolation:** direct Supabase client access to attempt, answer, result, submission, and role-assignment tables is denied by SQL grants, and RLS is enabled. Backend SQL uses owner predicates, but the runtime role and RLS behavior could not be verified. Keep test and role-lookup features disabled.
- **Answer-key protection:** currently fails at the database boundary. UI gating in the practice page is only presentational. A safe remediation needs an approved migration that removes direct base-table answer-key access, a safe published-question projection, and an answer-checking flow that does not return official keys before submission. The frontend, backend, grants, and RLS policy must be rehearsed together before production approval.
- **Schema reconciliation:** the migration version list matches the four local versions, but the live published-test policies and `public_test_questions` view are additional schema state. Their ownership/provenance must be reviewed and represented in a controlled migration before further test-engine security work.

## Next gates

1. Correct the local DB endpoint to the verified target and require certificate/hostname validation (`sslmode=verify-full` with the project's CA); then repeat connection and runtime grant checks without exposing the URI.
2. Provide the separate bootstrap process-only values if bootstrap validation is needed later; continue to treat owner-role bootstrap as disabled and never run it during these checks.
3. Obtain an approved real access token through the normal Auth flow for a redacted end-to-end JWKS verification, or leave that check blocked.
4. Prepare and review a local-only answer-key policy/view/API migration proposal; do not apply it to production without explicit approval.
5. Re-run the API suite on a supported test environment where Windows event-loop `socketpair()` initializes successfully, or use a supported Python/toolchain after one is made available.
