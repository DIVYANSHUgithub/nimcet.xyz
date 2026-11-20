# Student workflow verification — 2026-11-16

Update, 2026-11-17: the failures recorded below have been corrected and the
interactive suite now passes. See `student-workflow-reliability-2026-11-17.md`.

Scope: owner-provided submitted attempt `287f9281-7de5-44ff-b904-f72556304981`,
read-only persistence/ownership checks, and isolated interactive React component
tests. No student record, score, answer, review flag or attempt limit was changed.

## Passed

- Both selected answers are persisted at answer version 1.
- Both questions are visited; the second question's review flag is persisted.
- A fresh repository session load returns both answers and one review flag.
- Stored result is 3/8: one correct, one incorrect, none unanswered.
- Foreign-identity repository reads deny session, result and answer review.
- In-process API verification with the same read-only live repository and
  synthetic principals: owner session/result/review each return 200; foreign
  session/result/review each return 404. This tests the API handlers/ownership
  boundary without retrieving or impersonating a browser token.
- Interactive component remount restores the synthetic saved answer/review state.
- The remount does not reset the synthetic server-derived countdown.

## Reproduced failures requiring correction

1. The header claims Autosaved after a failed navigation/review request. Navigation
   requests are not counted in savingCount and their failures do not affect that
   header state.
2. A failed answer save also returns to Autosaved when savingCount reaches zero,
   while the unsaved optimistic answer and error remain in the component.
3. The online event updates only connection state. It neither reloads saved state
   nor retries the failed answer, leaving the optimistic answer unconfirmed.
4. An older answer request's finally handler unconditionally deletes the question
   from answerQueues, even when a newer queued request occupies the map entry.
   Submission can then miss the newest pending answer. The controlled test
   reproduced submission while that second request was still unresolved.

## Verification method and limits

`clientFront/scripts/check-student-workflow.mjs` mounts the actual TestAttempt
component in jsdom with a Vite-injected synthetic testsApi, not a replacement
component. It injects failures and deferred promises and performs UI clicks.
It returns failure while the four checks above remain unresolved. The two healthy
remount/countdown checks pass. No application server is started, no environment
file is loaded, and no real credentials or user attempts are used in that script.

Run from clientFront: `node scripts/check-student-workflow.mjs`.
Its pinned test-only jsdom 27.0.1 dependency is now declared in the frontend's
development dependencies. Run `npm ci`, then `npm run test:workflow`, in clientFront.

Browser automation failed during initialization with `failed to write kernel
assets: The system cannot find the path specified (os error 3)`. No live-browser
refresh, disconnect, multi-account interaction or successful browser outcome is
claimed. The synthetic disconnect/reconnect checks establish component behavior,
not real-network timing or hosted concurrency guarantees.
