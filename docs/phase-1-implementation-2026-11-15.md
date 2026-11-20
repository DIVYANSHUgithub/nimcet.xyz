# Phase 1 implementation — 2026-11-15

Status: **in progress; not production-ready**. Existing applications, migrations,
data, local configuration, and unrelated working-tree changes were preserved.
No production write, deployment, bootstrap, migration, grant, or policy change ran.

## Implemented locally

- Trusted role resolution accepts `test_manager`. Multiple active assignments
  (including duplicate rows), unknown codes, and malformed subjects fail closed
  through the existing 503 `role_storage_unavailable` contract. Successful empty
  lookups retain the existing Student fallback; durable Student provisioning is
  still outstanding.
- Test draft/version creation accepts Test Managers and administrators. Editors
  now receive 403. Publishing remains restricted to administrators.
- Role management accepts `test_manager`; admin access, dashboard access and the
  role selector recognize it. No role row or assignment was created.
- Role grants serialize by target account with a transaction advisory lock and
  reject another active primary role with HTTP 409 `primary_role_conflict`.
  Repeating the same grant retains the existing idempotent behavior. This guard
  covers this backend's grant path; it is not a substitute for a database-wide
  unique constraint or a trusted atomic role replacement workflow.
- Corrected the pre-existing uncommitted test assertions that expected feature
  flags to default to true. Both implementation defaults remain false.

Modified implementation files: `backend/app/db/roles.py`,
`backend/app/api/v1/routes/admin.py`, `backend/app/api/v1/routes/test_authoring.py`,
`backend/app/schemas/admin.py`, `admin/adminFront/src/adminAccess.js`, and
`admin/adminFront/src/AdminApp.jsx`. Regression coverage lives in
`backend/tests/test_phase1_authorization.py`, `backend/tests/test_admin_api.py`,
and `tests/adminAccess.test.js`.

## Validation actually executed

- Backend authorization/default-flag selection: **16 passed, 22 deselected**.
- New authorization tests plus test-engine domain, question repository and PYQ
  validation suites: **36 passed** (overlaps the selection above).
- Student `npm test`: **17 passed**.
- `npm run admin:build` from `clientFront`: **passed**.
- `git diff --check`: **passed**.
- Permission tests exercise the actual dependency directly without starting a
  Windows event loop. HTTP integration, concurrent PostgreSQL grant behavior,
  live persistence, complete backend suite, student build and lint were not run
  in this implementation pass. Previous TestClient/socketpair blockage remains
  documented in the security retest report; it is not declared resolved.

## Read-only live evidence and remaining blockers

A read-only metadata query against intended project `wcxxyyebcgofziylgwdg`
confirmed column SELECT privileges for both `anon` and `authenticated` on
`questions.correct_option` and `questions.explanation`. This establishes grants,
not an end-to-end exploit proof. Existing frontend direct question reads remain
an answer disclosure concern. A second query to inspect role codes and conflicting
assignments failed at the connector transport; live role state was not reverified.
The Supabase documentation/changelog request also failed at connector transport.

The existing schema reconciliation and security reports remain the baseline for:

1. Least-privilege runtime database identity and strict TLS verification.
2. Answer-column exposure and safe practice/backend API contracts.
3. Five-role schema support, one-primary-role enforcement, durable Student
   provisioning, and safe role replacement without losing the last Super Admin.
4. Four live policies and the safe-column view outside local migration definitions.
5. Mandatory email verification and full authentication journey validation.
6. Isolated database rehearsals and HTTP/integration security tests.

Before enabling either feature flag, reconcile these concerns against live state.
Production database/Auth/security changes and privileged assignment require the
owner's explicit approval under the master prompt. No such approval is inferred
from the request to begin Phase 1. The original question dataset is untouched.
