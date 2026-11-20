# Backend runtime role setup — 2026-11-15

Step 2 created `nimcet_backend` in project `wcxxyyebcgofziylgwdg` and replaced
the local ignored backend `DATABASE_URL` after verifying the new pooler login.
The connection retains `verify-full` and the configured CA certificate.
Restart the backend to replace any existing operator connection pool.

The operator script is `backend/scripts/setup_runtime_role.py`. It refuses an
existing role rather than silently rotating a live password. It generates the
password locally and never prints it. A failed post-commit login leaves an
ignored `.env.runtime.pending` recovery file; successful setup removes that file.
No credentials are included in this report.

## Authorization boundary

This is a server login, not a Supabase Auth application role. It has no role
memberships, owned relations, superuser, database creation, role creation,
replication, or RLS bypass attributes. It cannot create objects in `public` or
read `auth.users`. No browser role is granted membership in this login.

FastAPI remains responsible for end-user authorization and student ownership.
Role-scoped RLS policies admit the backend's operations on named tables only;
these policies deliberately do not provide student isolation for someone holding
the backend database password. Keep that password server-only.

| Tables | Granted operations |
| --- | --- |
| questions | SELECT |
| roles | SELECT; UPDATE(id) only to permit existing SELECT FOR UPDATE locks |
| user_roles | SELECT, INSERT, UPDATE |
| admin_audit_log | SELECT, INSERT |
| tests, test_versions | SELECT, INSERT, UPDATE |
| test_sections, test_questions | SELECT, INSERT |
| test_attempts, attempt_questions, attempt_answers | SELECT, INSERT, UPDATE |
| test_submissions, test_results, section_results | SELECT, INSERT |

No DELETE, TRUNCATE, REFERENCES, TRIGGER, sequence, ownership or default grants
were added. Existing tables, triggers, data, and browser-role policies were preserved.

## Verification

- All 14 application tables are RLS-enabled; runtime counts matched operator
  counts during the setup transaction without printing row data or counts.
- Effective table permissions matched the matrix, including denied destructive
  privileges. Existing role-row locking query succeeded.
- Real pooler authentication succeeded as `nimcet_backend` with TLS.
- A fresh instance of the backend's actual `Database` class passed `ready()`
  using the saved `.env`; confirmed no elevated attributes, memberships or ownership.
- Both feature flags remain false. Attempt writes and end-to-end scoring have
  not yet been exercised; those belong to the later functional validation step.
- Supabase security advisors still report no-policy information for five
  taxonomy tables, warnings for existing `rls_auto_enable()` execution grants,
  and disabled leaked-password protection. Those findings were not changed here.

This was operator provisioning, not a schema migration or migration-history repair.
Account for these new policies in the upcoming schema reconciliation step.
