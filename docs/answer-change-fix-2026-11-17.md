# Answer changes before submission — 2026-11-17

The repository used INSERT ... SELECT ... WHERE expected_version=0 followed by
ON CONFLICT DO UPDATE. When revising a saved answer, expected_version is positive,
so the SELECT emits no candidate row and PostgreSQL never reaches the conflict
update. The request incorrectly returned answer_version_conflict.

The save operation now uses an explicit INSERT ... ON CONFLICT DO NOTHING for
version zero and an UPDATE ... WHERE version=expected_version for later saves.
Both return the persisted answer and its version. A zero-row result remains a
conflict. Missing answers cannot be created using a nonzero revision, and replayed
first-save requests cannot overwrite an existing answer. Ownership, status,
deadline validation, attempt locking and finalized-answer guards remain intact.

Students may select another option before submission or clear an answer back to
unanswered with the new Clear answer control. Updated/cleared answers use the same
serialized autosave queue, with optimistic display and confirmed revision tracking.

Validation:

- Full backend suite: 159 passed.
- Actual repository-generated SQL executed on isolated PostgreSQL/PGlite:
  initial save, answer change, clearing, reselection, revision increments, stale
  rejection, first-save replay denial, missing-answer positive-version denial,
  and finalized-edit rejection passed. Run
  `node backend/scripts/rehearse_answer_changes.mjs` from the repository root.
- Interactive React workflow checks: 23 passed, including saved answer changes,
  persistence after remount, clearing, rapid changes and pending-save submission.
- Targeted frontend lint, production build and whitespace checks passed.

No live student answer, result, attempt or limit was modified during development.
The PostgreSQL rehearsal is isolated and does not establish a new browser or
hosted concurrency verification result. Refresh the client before manual acceptance.
