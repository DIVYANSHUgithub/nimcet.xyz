# Phase 2 development handover — 2026-11-16

Readiness: **development-ready; not production-verified**.

The implementation preserves both React/Vite apps, FastAPI, existing routes,
canonical question IDs, legacy question fields, test snapshots, and user work.
No original dataset was read, transformed, recovered, or imported. Production
inspection was limited to column metadata. No production migration, Storage
operation, role assignment, deployment, or application-data write was performed.

## Delivered locally

| Scope | Implementation |
| --- | --- |
| Question management | Protected create/read/update/search/pagination; draft, review, published and archived states; optimistic revisions; transactional audit events; archival retains canonical rows |
| Catalog | Examination/section and Subject → Topic → Subtopic APIs and admin forms; parent FKs, active hierarchy checks at publication, no reparenting through update |
| Rich content | Strict version-1 text/LaTeX/image blocks; exactly four single-correct MCQ options; UUID option IDs preserved across edits/reordering; shared React rendering without arbitrary HTML |
| Media | Backend-authorized binary upload; 5 MB request/output cap, 16 MP limit; Pillow 12.3.0 decode/re-encode strips metadata and appended payloads; PNG/JPEG/WebP only; immutable server-generated paths; private Storage proxy; draft preview restricted to authors |
| Practice | Initial public responses exclude correct answers, explanations and full authoring documents; POST validates option membership and optional revision before returning feedback; detail/featured practice updated; daily cards link to practice |
| Browsing | Legacy filters retained; examination, section, catalog subtopic and explicit PYQ-only filtering; occurrence year/examination/section predicates match the same occurrence |
| PYQ metadata | Multiple occurrences reference one canonical question; unique examination/year/section/position; source required; updates share the question-save/audit transaction |
| Phase 1 dependency | Disabled PyJWT's indefinite individual-key cache, retaining its bounded JWK-set cache |

Question Editors, Test Managers, Administrators and Super Administrators may
author content. Only Administrators and Super Administrators may publish
questions. Students cannot access editorial endpoints. This is question
publication; test approval and publication remain Phase 3 work.

The existing `chapters` relation is exposed as product **topics**, and existing
`topics` as product **subtopics**. This compatibility adapter does not rename
tables or backfill legacy labels. Review the mapping before production rollout.

## API contracts

All routes are under `/api/v1`:

| Method/path | Contract |
| --- | --- |
| GET `/questions`, `/questions/{id}` | Safe browse projection; `statement_blocks`, `option_ids`, `revision`; no answer fields |
| POST `/questions/{id}/practice` | `{option_id, expected_revision?}` → selected/correct IDs, correct display index, correctness and explanation blocks; stateless practice, no exam result writes |
| GET `/catalog` | Active catalog projection with inactive ancestor branches excluded |
| GET/POST `/admin/questions` | Search/page or validated create |
| GET/PUT `/admin/questions/{id}` | Full editorial representation or revision-checked save |
| GET/POST `/admin/catalog/{kind}` | List or create whitelisted catalog level |
| PUT `/admin/catalog/{kind}/{uuid}` | Rename/code/status update; parent remains fixed |
| POST `/admin/media` | Raw binary body with bearer authentication; returns `{id,url}` |
| GET `/admin/media/{uuid}` | Author-only preview, including drafts |
| GET `/media/{uuid}` | Image proxy only when referenced by a published question; no-store and nosniff |

Catalog kinds: `examinations`, `sections`, `subjects`, `topics`, `subtopics`.
Question saves use `expected_revision` (0 for new/legacy records). A concurrent
edit returns 409. Unknown media or inconsistent taxonomy returns 422. Duplicate
catalog codes/question or paper positions return 409 without raw driver details.

Rich content fields are defined in `backend/app/schemas/content.py`. An image
block is `{type:"image",media_id:"UUID",alt:"description"}`; external URLs and
arbitrary HTML fields are rejected. Text blocks support inline math delimiters;
LaTeX blocks display an equation. Correct option IDs never appear in initial
student browse responses. Occurrences are stored in `question_occurrences` and
assembled into editorial documents when read, rather than duplicating content.

## Database and configuration

CLI-generated migration:
`supabase/migrations/20261115205355_phase2_question_bank.sql`.
Its filename uses the CLI/host clock; this handover uses the client's date.

It adds nullable rich content and subtopic/author references, revision and
editorial state metadata to `questions`, plus `question_media` and
`question_occurrences`. Existing question content is not backfilled. New tables
enable RLS and deny direct browser access. Conditional grants/policies support
the existing `nimcet_backend` runtime role; anonymous full-table question SELECT
is replaced with an explicit safe-column grant. The migration does not create
a Storage bucket or alter existing Storage policies.

Backend configuration, documented in `.env.example`:

```dotenv
QUESTION_AUTHORING_ENABLED=false
SUPABASE_STORAGE_KEY=
STORAGE_BUCKET=question-media
```

Keep the Storage secret server-only. The feature remains disabled in defaults;
no ignored `.env` was edited. Existing browse/practice can serve legacy records
without the migration while authoring is disabled.

Frontend: `VITE_API_BASE_URL` must point to the backend `/api/v1` base. The default
question mode is now `backend`. Explicit `VITE_QUESTION_API_MODE=supabase` retains
legacy safe-column browsing, but rich content/revision-aware practice should use
the backend mode. There is no insecure answer-key fallback on backend failure.

## Validation executed

- Full backend suite: **103 passed**, using Windows Selector policy outside the
  sandbox because in-sandbox TestClient loopback initialization stalls.
- Student JavaScript tests: **20 passed**.
- Student production build: **passed**.
- Admin production build: **passed**, with the large-bundle warning described below.
- Student ESLint and targeted admin ESLint: **passed**.
- Isolated migration rehearsal: **passed** on bundled PGlite/PostgreSQL 18.6.
  Checked preservation of a synthetic legacy row, catalog FKs, runtime grants/RLS,
  stale revision rejection, unique PYQ positions, private media, safe browser
  projection and denial of answer/document column reads.
- `git diff --check`: passed during implementation; final whitespace check also passed.

Rehearsal command: `node backend/scripts/rehearse_phase2.mjs`. It uses the existing
ignored PGlite installation under `backend/.tmp/bootstrap-rehearsal`; it is not a
new production dependency. It opens an isolated in-memory database, never the
configured production URI. PGlite 18.6 is not an exact Supabase/PostgreSQL 17 match.

Added tests exercise malformed documents, duplicate/stable option IDs, option
reordering, publication requirements, response separation, server-side practice,
author permissions, revisions, invalid/oversized image rejection, image
sanitization, upload registration/audit, and correlated PYQ filtering. Storage
HTTP calls in API tests are mocked; real Storage connectivity is not claimed.

## Activation and remaining verification

1. Review current live grants/policies/view definitions and the taxonomy adapter.
2. Replay the migration on isolated Supabase/PostgreSQL 17 staging and confirm
   runtime permissions, existing safe views and legacy test workflows.
3. Provision a private staging bucket with the approved image MIME/size limits;
   configure a server Storage key. No browser upload policies are needed because
   uploads pass through the authorized backend.
4. Enable the authoring flag only in staging. Exercise editor → question → media
   → administrator publication → student browse/answer/feedback, including mobile
   and keyboard use. Verify actual Storage failures and retries.
5. Verify a production backup/recovery procedure and obtain explicit owner approval
   before production migration, bucket/configuration changes or deployment.
6. Deploy the matching frontend/backend versions together and verify real users
   cannot select answer/document columns directly.

Rollback should first disable authoring and preserve all additive data. Do not
automatically drop the new columns/tables or restore permissive browser grants.
Old frontend bundles that request `SELECT *` will fail after the grant change;
coordinate frontend deployment. Existing backend browse responses intentionally
changed to omit answers, so external consumers must adopt the practice endpoint.

Not yet verified: browser visual/end-to-end QA, actual Storage upload/access,
PostgreSQL 17 staging replay, production grant reconciliation and deployment.
If Storage upload succeeds but registration fails, the API reports failure;
an unreferenced immutable object can remain for an operator to inspect/remove.
There is no automatic object deletion, avoiding accidental removal of content
used by historical questions/tests. Published image references are accessible
through the media proxy; keep private student information out of educational media.

The admin bundle now includes the shared mathematics renderer and exceeds Vite's
500 kB advisory threshold; code splitting is a follow-up optimization. Active-test
rich question/solution snapshots and review rendering must be completed in the
later test-authoring/engine phases; this work does not claim that integration.
Other Phase 1 follow-ups, including durable Student roles, atomic primary-role
replacement and session revocation behavior, are not declared resolved here.


Image dependency review: pinned Pillow 12.3.0 after checking the
[upstream security advisory](https://github.com/python-pillow/Pillow/security/advisories/GHSA-pg7v-jwj7-p798).
The decoder explicitly restricts opened formats to PNG, JPEG and WebP in addition
to signature, decoded-pixel and output-size checks.
