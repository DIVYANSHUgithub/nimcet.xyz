# Phase 1 Security Retest — 2026-11-06

**Scope:** Retest of previously failed or blocked items after local configuration changed. Values and credentials remain redacted. All live database queries were SELECT-only metadata checks. No migrations, bootstrap, permission changes, policy changes, Auth settings, or data writes were performed.

## Current results

| Check | Result | Redacted evidence |
| --- | --- | --- |
| DB endpoint/project identity | **BLOCKED** | The current `DATABASE_URL` host is now a Supabase pooler endpoint whose username identifies the supplied project. A strict-TLS connection attempt reached certificate verification and failed before PostgreSQL authentication. No session role or database identity was established. The URI and credentials were not printed. |
| Runtime role / effective grants | **FAIL** | The pooler login maps to the project owner-level PostgreSQL role. Read-only metadata shows `BYPASSRLS`, `CREATEDB`, and `CREATEROLE`, plus SELECT/INSERT/UPDATE/DELETE on all 19 public tables. It is not a least-privilege runtime role. The actual session remains unconfirmed because TLS verification failed. |
| TLS certificate/hostname verification | **FAIL** | The stored URI uses `sslmode=require` and has no configured root certificate. A read-only attempt with `sslmode=verify-full` and the system CA store failed certificate verification. No weaker-TLS retry was made. |
| Bootstrap preflight | **FAIL** | The bootstrap script reads process environment only. All four required process variables remain absent. In the backend dotenv file, only `BOOTSTRAP_OWNER_ROLE` is present; it does not match the PostgreSQL role mapped by the pooler login. Bootstrap was not executed. |
| Backend full test suite | **BLOCKED** | Retest again collected 61 tests, passed the first three role-resolver tests, then stalled at `test_admin_dashboard_requires_backend_role_before_reading_counts`. The prior minimal-app reproduction and stack still isolate the hang to Windows Proactor `socket.socketpair()` initialization before routing. Separate retests passed: 24 domain/repository tests, 3 role-resolver tests, 2 JWKS tests. |
| RLS/student isolation/answer-key/schema | **FAIL overall** | Rechecked live metadata: RLS remains enabled on all 19 public tables, none use `FORCE ROW LEVEL SECURITY`; anon/authenticated still have no direct grants on the seven student/role tables. Both can still SELECT `correct_option` and `explanation` from `questions`. Four published-test policies remain, and the security-invoker `public_test_questions` view remains granted to anon/authenticated while excluding key columns. These objects remain outside the matching local test-engine migration. |

Both local feature flags remain `false` in the backend environment and code defaults. No frontend or production setting was modified during this retest.

## Interpretation

The endpoint reference now matches the project, but authenticated DB connectivity remains unverified because strict TLS validation fails. Keep using no database account until the project CA certificate is configured and `verify-full` succeeds. The configured role is owner-level and must be replaced by a dedicated, least-privilege runtime role before backend integration. Answer-key access remains a live database exposure; resolving it requires a separately reviewed migration/API change and explicit production approval.
