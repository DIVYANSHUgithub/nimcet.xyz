# Client readiness checklist

Updated 4 November 2026 from the current workspace. This tracks repository-visible readiness and known external gates; it is not a production approval.

## Checklist

- [x] Inspect repository instructions, docs, git status, client/admin/backend code, migrations, and deployment files. The working tree contained extensive pre-existing changes; they were preserved.
- [x] Trace `/tests` and `/results` through the frontend API client, FastAPI routes, database repositories, and environment configuration.
- [x] Correct the local frontend API URL to match the documented FastAPI port (`http://localhost:8000/api/v1`).
- [x] Make unavailable/disabled test-service responses distinguishable from a genuinely missing test and provide retry guidance for service errors.
- [x] Restore safe defaults: trusted role lookup and test routes stay disabled until their database and project gates are verified.
- [x] Run frontend lint, client/admin builds, and existing Node tests.
- [ ] Confirm the intended Supabase project. Current ignored local frontend/backend configuration and `supabase/.temp/project-ref` point to `wcxxyyebcgofziylgwdg`; the latest schema-audit report identifies `fchvtcnhabmnlfxsrzvu` as the owner-specified project. Do not mix credentials or apply migrations until the owner resolves this mismatch.
- [ ] Reconcile the latest project’s question/Auth counts, migration ledger, extra test policies/view, Auth UUID, RLS, grants, Auth/JWT settings, Storage, and runtime role using fresh read-only evidence. The existing audit says 102 questions in the 1 November snapshot and one question in the 4 November snapshot. No restore or production writes were attempted.
- [ ] Supply a TLS database URL for the confirmed project and a least-privilege runtime role; the current ignored backend `.env` has an empty `DATABASE_URL`.
- [ ] Rehearse migrations and ownership/RLS/security tests on an isolated PostgreSQL/Supabase-compatible database. Docker is installed, but its daemon is unavailable in this environment.
- [ ] Verify student signup/login and the test lifecycle against non-production data, including result release and cross-user isolation.
- [ ] Establish a verified first administrator for the confirmed project; no current bootstrap identity or authorization is established by this task.
- [ ] Implement the admin question/test authoring and publishing UI. Current admin app is a read-only dashboard/role shell and explicitly says editorial tools are not enabled.
- [ ] Decide whether PYQ publication is in launch scope and supply verified source papers, answer keys, and mapping data. No PYQ content is fabricated.
- [ ] Verify hosting environment variables, API deployment, CORS, Supabase Auth redirect allow-list, domain settings, backups, monitoring, and incident recovery with the deployment owner.

## Verification recorded

- `clientFront`: `npm run lint` passed; `npm run build` passed.
- `admin/adminFront`: `npm run lint` and `npm run build` passed.
- Existing frontend Node suite: `node --test --test-concurrency=1 ..\tests\*.test.js` passed 14 tests.
- Backend `pytest` did not finish: it stalled during `tests/test_admin_api.py::test_admin_dashboard_requires_backend_role_before_reading_counts` after the first three tests passed. A timed traceback shows AnyIO blocked in Python 3.13 Windows `asyncio` socketpair setup (`socket.py:accept` from `_fallback_socketpair`). The isolated config-default test passed; `tests/test_pyq_validation.py tests/test_questions_repository.py tests/test_test_engine.py` passed **24 tests**; `python -m compileall -q app tests` passed.
- Migration smoke tests and API/database integration tests were not run because no isolated database is available and the intended project is unresolved.
- Supabase CLI project listing could not run because the CLI failed to write `C:\Users\smish\.supabase\telemetry.json.tmp...` with `EPERM`. No remote mutation was attempted.

## Findings and scope

- The test/history pages call FastAPI. The local browser config pointed at port 80 while the backend setup runs on port 8000; this is corrected locally.
- The backend’s current local database URL is empty. Without a database, test/history APIs cannot return catalog or history data. The frontend now explains disabled test routes and 503 service errors; it does not synthesize content.
- The backend config had privileged role lookup and test routes enabled by default while the documented/bootstrap gates were unresolved. Both defaults are now false; explicitly enable them only for a verified deployment.
- Local frontend/backend Supabase configuration conflicts with the latest owner-project audit. This prevents reliable claims about live data and is the principal external blocker.
- Production database, Auth, Storage, deployment, and data were not changed.
