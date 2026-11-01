# Supabase and Database Security Design

## What was observed

- An anon-key PostgREST request can read 102 rows from `public.questions`; all returned rows have `status='published'`.
- This proves effective anon read access for those rows, but it does **not** reveal whether RLS is enabled, which policies exist, or whether other rows are hidden.
- The current frontend requests `select('*')`, which includes `correct_option` and `explanation`. That is expected for practice review in the current app; active test APIs must return a separate answer-key-free projection.
- No live RLS, grants, Auth roles, or Storage policies were exported. No security policy was changed.

## Enforcement model

1. FastAPI verifies Supabase access-token signature, issuer, audience, expiry, and subject.
2. FastAPI loads role assignments from a trusted database table; user-editable metadata is ignored.
3. Every write uses the verified subject as owner and validates the record's lifecycle and ownership. Client-provided owner IDs are never trusted.
4. PostgreSQL uses least-privilege database grants and RLS as a second boundary wherever the selected connection mode supports it.
5. A service-role key is not put in a frontend or used as a blanket authorization shortcut. Prefer a dedicated server DB role. If an operational need requires RLS bypass, document the exception, restrict the DB credential, and test every endpoint's auth/role/owner checks.
6. Transactions protect attempt start/limits, answer versioning, submission/evaluation, publication, and administrative role changes.

## Policy requirements by domain

| Data | Read policy | Write policy / denial case |
| --- | --- | --- |
| Questions | Anonymous/authenticated read only published practice projection, if that is the retained product rule | Draft edit for authorized editor scope; publishing only administrator; student update/delete always denied |
| Roles/profiles | User reads safe own profile; privileged roles are not exposed as mutable profile metadata | Only trusted role-management operation grants/revokes roles; self-promotion denied |
| Bookmarks/collections | Student reads own rows only | Insert/update/delete require `auth.uid() = owner_id`; second student's attempts must affect zero rows/return concealed 404 |
| Attempts/answers | Student reads own attempt and answer state only | Mutations require same owner, in-progress status, valid deadline, and test-question membership; client cannot set marks/correctness |
| Results | Student reads own result only after release policy | Backend-only insert/update from evaluator; other students and early-release requests denied |
| Reports/audit | Student sees own report state only; admins see authorized review scope | Student cannot change review status; audit log append-only to application roles |
| Storage | Read only eligible published media or authorized private media | Upload/update/delete only through role-checked server paths; arbitrary bucket/path writes denied |

Use explicit role grants and command-specific policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) with appropriate `USING` and `WITH CHECK`. Avoid broad `USING (true)` policies on protected tables. For public published-question access, validate the exact visible columns and key exposure; a safe view/API projection is preferable for tests.

## Database-level RLS checks

`supabase/tests/rls_questions_smoke.sql` is a read-only transaction-based check for the existing question table. It asserts that RLS is enabled, anon has SELECT, and anon cannot see non-published rows. It was not run because there is no authenticated remote DB connection or local database baseline. Since all 102 anon-visible rows are published, a separate seeded non-published fixture on an isolated clone is needed to prove the denial behavior.

`supabase/tests/README.md` records the required owner-isolation and role-denial cases for the future tables. Those cases cannot execute until verified schema and policies exist; no tests were run against production.

## Storage policy checks

- Confirm anon/student can retrieve only approved published media.
- Confirm student cannot list bucket contents, upload, overwrite, or delete any object.
- Confirm editor can upload only through authorized workflow and cannot replace unrelated objects.
- Confirm administrator deletion is blocked while referenced and succeeds only through audited orphan cleanup.
- Confirm private assets require an authorized short-lived URL and expired URLs stop working.

These cases require the actual bucket policy and test objects in a non-production project. No Storage policy changes were made.

## Secrets and logging

- Frontend only receives `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and the API base URL. The anon key is public configuration, not an authorization decision.
- Backend keeps `DATABASE_URL` and auth verification configuration in deployment secrets, with least-privilege connection and restricted network access.
- Never commit database passwords, Supabase PATs, service-role keys, OAuth secrets, signing keys, access/refresh tokens, or signed media URLs.
- Logs contain request IDs and safe entity identifiers, not tokens, passwords, signed URLs, answer keys, or full student responses.

## Open security decisions

- Current RLS enablement/policies and effective grants on `questions` and `storage.objects`.
- Whether the current anon question query intentionally exposes answer keys for all published questions.
- Supabase JWT algorithm/signing mode and verified issuer/audience.
- Backend DB role and whether RLS can be preserved with the deployed pooler mode.
- `questionImage` public/private class, MIME/size policy, and object ownership.
