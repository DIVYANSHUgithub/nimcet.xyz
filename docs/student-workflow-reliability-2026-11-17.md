# Student workflow reliability improvements — 2026-11-17

Corrected the three classes of failure reproduced in the previous verification.
Changes are confined to the student client and its tests/documentation. No
database migration, answer/result update, attempt creation or limit change ran.

## Behavior

- Submission locks new edits immediately and waits for every answer queue tail
  plus navigation/review writes. An older request cannot remove a newer queued
  save. Manual submission is blocked if unresolved edits remain, with Sync now
  available. A timer submission finalizes server-saved answers and warns if any
  local edits remained unconfirmed; it does not claim they were saved.
- Answer acknowledgements update revision metadata without replacing a newer
  optimistic choice. Individual answer/review errors remain visible until that
  specific operation is confirmed, rather than disappearing after an unrelated
  successful request. Both answer and navigation writes count toward save status.
- Status distinguishes Offline, Syncing, Unsaved changes, Saving and Autosaved.
- Reconnect, focus and Sync now use a shared single-flight reconciliation path.
  It waits for pending saves, reloads server state and CAS versions, preserves
  local unconfirmed selections/review flags, acknowledges already committed
  operations and retries only changes not confirmed by the server. Edits are
  paused during synchronization/submission. Completed attempts are reconciled
  without attempting new answer writes.
- Saved state still survives reload, and reload uses server-derived remaining
  time rather than restarting the test. Pending offline edits are memory-only:
  keep the page open until synchronization completes. Durable offline storage
  across closing/reloading the page is not implemented or claimed.

## Verification

`npm run test:workflow` mounts the actual React attempt component in jsdom,
with synthetic API data and controlled deferred/rejected promises. All 20 checks
pass, including saved answer/review remount, countdown continuity, failure-status
accuracy, reconnect recovery, repeated failure preservation, blocked unsaved
submission, lost-response deduplication, CAS rebase, independent review failures,
expired-session handling, focus during a pending save, navigation submission
ordering and newer-answer submission ordering.

The pinned jsdom development dependency and lockfile make this runnable after a
clean frontend dependency install. No actual browser session or user token is
used. Existing JavaScript suite: 28 passed. Targeted ESLint and production build
passed. Whitespace checks passed. Backend code was not changed in this work.

These component checks do not replace a real-browser disconnect/reconnect check,
which remains the final manual acceptance step. Browser automation previously
failed initialization; no new successful browser run is claimed here.
