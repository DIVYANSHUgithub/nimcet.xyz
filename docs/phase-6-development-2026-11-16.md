# Phase 6 — Frontend integration, 2026-11-16

Status: **development-ready; browser and production verification pending**.
Existing branding, React/Vite apps, routes, FastAPI contracts and unrelated
working-tree changes were preserved. No production migration, deployment,
configuration change, privileged assignment or application-data write ran.
No dataset processing or recovery was performed.

## Student integration

- Tests, attempts and private results wait for authentication restoration and
  redirect signed-out users to Login with a validated internal return path.
  Successful login returns to the requested page instead of always Questions.
  Backend authorization remains authoritative; route guards are user experience,
  not a replacement for server permissions.
- Test catalogue and active attempt component state reset on account/attempt
  changes, complementing the existing private result/history reset behavior.
- Shared API requests now have a 20-second network/body timeout, distinguish
  caller cancellation from failure, and support authenticated binary uploads and
  image responses. Timed-out mutations are never retried automatically. The
  timeout does not imply the server failed to commit a write: clients tell users
  to check current state before retrying. Session-token lookup precedes this
  network timeout and is not itself bounded by it.
- Backend setup details for unavailable content, media and PYQ features are
  translated to user-facing messages. Existing safe error codes/status survive.
- Added route titles, skip-to-main-content navigation, route-change main focus,
  mobile menu controls/active-page state, reduced-motion styles, an offline/
  reconnection announcement and recoverable application-render failure screen.
  Offline announcements use browser connectivity events and do not claim to
  diagnose backend availability or provide fully offline examinations.

## Admin integration

- The authorized console expands beyond the original 480 px sign-in card into
  a responsive workspace. Sign-in retains its compact layout and design.
- Role-specific Overview, Questions & catalog, Test authoring, PYQ verification,
  Roles and Activity tabs use tab/tabpanel relationships and Arrow/Home/End
  keyboard operation. Role changes remove unauthorized tabs and fall back to
  Overview. Backend checks remain mandatory on every operation.
- Editorial, test and PYQ tools load lazily. Visited panels remain mounted when
  switching tabs, preserving local work. The same-account authorization refresh
  retains the workspace while making it inert until backend verification
  completes. A denied/unavailable check removes access; another account cannot
  inherit the old workspace.
- Question/catalog requests now distinguish initial loading, failure with retry
  and real empty records. A failed initial setup no longer presents usable-looking
  blank editing forms. Question saves lock fields during writes, detect unsaved
  changes before replacing a question and warn before leaving the browser with
  an unsaved question. This is not a persistent draft/autosave service; explicitly
  save before sign-out, denied-access recovery or closing the session.
- Image upload/preview uses the shared request boundary. A preview failure is
  reported without discarding the loaded question. PYQ verification distinguishes
  initial loading/errors from an actually empty candidate list.
- Added a real test-authoring workspace over the existing protected APIs: create
  public test drafts, select a draft/test, choose canonical published questions,
  configure sections/order/marks, duration, attempt limits, opening/closing and
  result/review schedules, then save a new version. Administrators can publish
  the saved regular version; PYQ versions use the separate verification flow.
  Editors cannot open the test-authoring tab or call its protected list endpoint.
- Responsive form grids, normal-sized checkbox/radio controls, focus styling,
  wrapped toolbar actions, and reduced-motion support were added.

Both Vite configurations explicitly deduplicate React/React DOM because the
admin app consumes shared student components while each app has its own installed
React runtime. Component rendering reproduced a duplicate-runtime hook failure
before deduplication. The corrected component integration checks pass. Frameworks
and dependency versions were not replaced or migrated.

The final admin entry chunk is approximately 452 kB (129 kB gzip), with question
tools/math in a separate approximately 280 kB chunk and test/PYQ tools in separate
small chunks. The prior single approximately 737 kB entry is no longer required
at sign-in. These are build sizes, not measured browser load-time results.

## Backend changes needed for integration

- GET `/api/v1/admin/tests?page=&search=` lists 30 nonarchived tests per page,
  including latest version identity/status. It is bound to Test Manager,
  Administrator and Super Administrator roles, uses parameterized search and
  existing database read permissions, and is mounted only when the test engine
  is enabled. No migration is needed for this endpoint.
- Test version creation rejects rich canonical content when immutable rich
  snapshots are unavailable, instead of silently creating a text-only snapshot.
  Phase 5 migration/activation remains required for rich test snapshots.

The new admin form configures **new versions**; it does not pretend to load or
edit an existing version's full configuration. A complete submission/rejection/
approval queue and broader Phase 3 workflow are still separate prerequisites.
Existing API validation remains responsible for duplicate question IDs, section
order, schedule consistency, scoring values, availability and authorization.

## Validation executed

- Backend: **125 tests passed**, including new test-list permission/pagination
  coverage. FastAPI tests used synthetic fixtures and out-of-sandbox Windows
  loopback access with Selector policy.
- JavaScript: **28 tests passed**, including safe login returns, page titles,
  active navigation, cancellation, timeout/no mutation retry, binary media and
  all existing question/result utility tests.
- Student build and admin build: passed.
- Student ESLint and admin source/config ESLint: passed.
- `node scripts/check-integration.mjs` from `clientFront`: passed. This uses Vite
  to server-render the actual components with synthetic auth contexts, checking
  navigation, protected loading/content and role-specific accessible tabs.
  It opens no listening HTTP server, loads no environment files, and does not
  contact the application/database. It is not a browser interaction test.
- `git diff --check`: passed.

Browser automation was attempted. Both the browser-control and Windows runtime
entry points failed to initialize with:
`failed to write kernel assets: The system cannot find the path specified. (os error 3)`.
No browser visual, screen-reader, keyboard-event, viewport or end-to-end result is
claimed. No screenshot of the changed UI was captured in this pass.

## Before sign-off or deployment

1. Restore browser tooling and verify desktop/mobile layouts at narrow widths,
   200% zoom, keyboard-only navigation, tab focus, skip link and reduced motion.
2. Verify actual user sign-in → return-to-route, expired sessions, account switch,
   admin role revocation/refresh, slow/offline requests, uncertain write outcomes
   and render/chunk-load recovery.
3. With Phase 2/5 dependencies active in isolated staging, complete question/media
   editing and preview, draft/version creation, normal/PYQ publication, student
   attempt, result and review journeys. No real student attempt was created here.
4. Verify staged backend/frontend API base URLs, auth redirects, CORS for both
   frontend origins, migrations, Storage and worker configuration together.
5. Complete the missing Phase 3/4 workflows; do not infer their completion from
   usable frontend forms. Obtain owner approval before production activation or
   deployment under the master prompt.

No new production feature flag or credential was enabled. Full Phase 6 acceptance
remains pending those browser/end-to-end and upstream dependency checks.
