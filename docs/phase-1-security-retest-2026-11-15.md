# Phase 1 Security Retest — 2026-11-15

**Scope:** Retest of the previously failed/blocked checks against the current local configuration and live project metadata. Credentials and tokens were not printed. Database work was read-only; no bootstrap, migration, policy, grant, Auth, or data write was performed.

| Check | Result | Redacted evidence |
| --- | --- | --- |
| Database connectivity / project identity | **BLOCKED** | The current URL now identifies the supplied project's pooler endpoint, and DNS resolves. A strict `verify-full` connection attempt still failed certificate verification before PostgreSQL authentication. No live session/database identity was established. |
| Runtime role / effective grants | **FAIL** | The pooler login maps to the project's owner-level PostgreSQL role. Read-only metadata shows RLS bypass, database/role creation privileges, and SELECT/INSERT/UPDATE/DELETE on all 19 public tables. It is not a least-privilege runtime identity; the actual session was not established. |
| TLS certificate/hostname verification | **FAIL** | The stored URL uses `sslmode=require` with no configured root certificate. The strict `verify-full` attempt using system trust failed certificate verification. No weaker-TLS connection was attempted. |
| Bootstrap preflight (not executed) | **FAIL** | The bootstrap script's four required process environment variables are absent. Only `BOOTSTRAP_OWNER_ROLE` is present in `backend/.env`, and it does not match the owner-level role mapped by the current pooler login. No bootstrap command ran. |
| Backend full test suite | **BLOCKED** | Pytest collected 61 tests, passed the first three role-resolver tests, then stalled at `test_admin_dashboard_requires_backend_role_before_reading_counts`. The same pre-route Windows Proactor `socket.socketpair()` initialization hang reproduces. Separate suites passed: 24 domain/repository tests, 3 role-resolver tests, and 2 JWKS tests. |
| RLS, student isolation, answer keys, schema drift | **FAIL overall** | Live metadata reconfirms RLS enabled on 19/19 public tables and forced on 0/19. Anon/authenticated have no direct grants on the seven student/role tables, but both can select `correct_option` and `explanation` from `questions`. Four published-test policies and a security-invoker safe-column view remain beyond local test-engine migration history. |

Both local feature flags remain `false`. The current direct-client student data grant boundary still denies access to attempt/result rows, but the backend runtime role cannot be trusted until replaced and verified. No production state changed during this retest.
