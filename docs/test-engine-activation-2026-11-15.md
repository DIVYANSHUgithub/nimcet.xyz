# Test engine activation — 2026-11-15

The owner confirmed real sign-in to the local admin app: role-management tools
and the first-super-administrator audit event were displayed.

Enabled `TEST_ENGINE_ENABLED=true` in ignored backend `.env`; trusted role lookup
remains enabled. Triggered the existing Uvicorn reload. Verified `/ready` returns
200 and OpenAPI includes tests, personal attempt history and personal analytics.
Each route returns 401 for an unauthenticated request, replacing the original 404.

The test routes previously required the exact `student` role. Because trusted
storage uses one primary role, this denied practice to the confirmed super admin.
Changed those practice/personal-result routes to require a verified principal;
repositories continue to filter attempts/results by that principal's user ID.
Admin authoring/publishing/role-management permission checks are unchanged.
Regression coverage verifies own-attempt access and foreign-attempt denial for
student, editor, test_manager, administrator and super_administrator identities.

Fixed TestCatalog so an error cannot also display its empty-catalog state.
Two pre-existing admin test fixtures omitted the role repository's existing
advisory-lock/conflict checks; corrected their response queues and assertions.

Validation: full backend suite 78 passed with Windows Selector event-loop policy;
ESLint on the changed catalog component passed. Test fixtures use local identities,
not real tokens. No real student attempt or score was created during activation.

Remaining user validation: reload local /tests and /results, confirm the existing
published test and personal results load, then exercise start, answer autosave,
resume, submit, and released results. Availability and attempt limits still apply.

## User verification follow-up

User screenshots confirm catalog loading and a released timer-submitted result.
Read-only checks for the owner-selected account show one used attempt, no active
attempt, and released result/review. A one-minute deadline elapsed before the
submission was processed on reopening, roughly nine minutes after start. History
had displayed processing delay as test time. Added deadline_at to the history
response and capped displayed elapsed duration at that deadline, preserving stored
submission timestamps. Verified this attempt's effective duration is 60 seconds.
Also clear old catalog errors when loading begins and use singular question labels.

The initial screenshot's network failure could not be reproduced; backend
readiness and actual repository reads passed. Its exact historical cause is
unverified. The successful later screenshots do not establish answer-autosave or
manual-submission behavior; those still need a fresh attempt. The existing test
allows one attempt, now consumed; no limits, answers or scores were modified.

Validation after the duration fix: 19 JavaScript tests and all 78 backend tests
passed. ESLint passed on the changed frontend files.
