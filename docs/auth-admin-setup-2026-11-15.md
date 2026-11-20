# Authentication and administrator setup — Step 4

Update: the owner confirmed successful real admin sign-in by screenshot. Step 4
is complete. The engine was subsequently enabled; see
`test-engine-activation-2026-11-15.md` for current status and remaining user checks.

Project: `wcxxyyebcgofziylgwdg`. Owner-selected Auth UUID:
`7367f508-253f-4a98-a06e-0236f198296c`.

## Verified and completed

- Student/admin frontends and backend use the same project. Public JWKS returns
  an ES256 P-256 signing key matching backend mode, algorithm, issuer and audience
  configuration. A real signed-in user token still needs UI verification.
- Backend returns 401 for missing/malformed tokens. All 27 focused authentication
  and role-authorization tests passed using local fixtures and Windows Selector
  event-loop policy; these tests do not replace a real-token sign-in test.
- Narrow account preflight verified the owner-selected UUID exists, is confirmed,
  and had no active role. Aggregate checks found no prior super-admin/bootstrap.
- The exact bootstrap transaction was rehearsed on isolated PGlite 0.5.16
  (PostgreSQL 18.6), not on production. Missing/unconfirmed account denial, audit
  failure rollback, successful atomic assignment/audit, repeat denial and existing
  role conflict denial passed. Live database remains PostgreSQL 17; this is a
  compatible SQL rehearsal, not a complete hosted-environment reproduction.
- Executed the owner-selected bootstrap through the connected database operator.
  Verified one active super administrator and one matching bootstrap audit event.
  `backend/scripts/bootstrap_approved_super_admin.sql` records the guarded SQL;
  it is a one-time operation, not an automatic migration. Repeating it is rejected.
- Runtime role resolver returns `super_administrator` for the selected account
  and `student` for an unassigned UUID. No claims or user metadata grant roles.
- Enabled `TRUSTED_ROLE_LOOKUP_ENABLED=true` in ignored backend `.env` and
  triggered the existing Uvicorn watcher to reload saved configuration.
- After reload, `http://localhost:8000/ready` returns 200 / `status: ready`.
  Student app is available on 5173; admin app is available on 5174.
- Added `http://localhost:5174` to local backend CORS origins alongside 5173;
  otherwise the browser would block the admin app's authenticated API requests.

## Remaining user sign-in check

Open `http://localhost:5174` and sign in with the selected account's existing
credentials. Confirm the page says `Access verified by the backend for:
super_administrator` and loads dashboard counts and the audit trail. Never paste
passwords or access tokens into chat. The test engine remains disabled until
this authentication step is confirmed.

The broader account-list query was rejected by automatic approval review; it
returned no account list. Subsequent checks used only aggregate counts and
yes/no facts for the UUID explicitly selected by the owner.

Existing security-advisor follow-ups remain as recorded in Step 2, including
public `rls_auto_enable()` execution grants and leaked-password protection. Those
settings were not modified as part of this account bootstrap.
