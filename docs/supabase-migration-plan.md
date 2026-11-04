# Supabase Migration Plan

**Status:** The catalog, trusted-role, question-baseline, and test-engine migrations passed a disposable PostgreSQL 17.6 rehearsal. The current linked production ledger records all four as applied, though this investigation applied none. Production role bootstrap is blocked because the specified Auth UUID is absent; schema/count differences also require owner reconciliation before further changes.

## Baseline and production gate

The 2026-11-04 linked read-only check verified PostgreSQL 17.11, the `supabase_migrations.schema_migrations` ledger, and four applied versions: catalog, trusted roles, questions baseline, and test engine. The role tables match the local migration and have RLS enabled with no direct client table access. The owner-specified Auth UUID is absent, current question/Auth counts differ from the 2026-11-01 snapshot, and extra public test policies/view need provenance review. Auth JWT configuration, Storage settings, backup/PITR, and the deployed backend role/mode remain pending. See `docs/supabase-live-schema-audit-results.md` for the exact read-only findings.

The current remote ledger records the catalog and question-baseline versions as applied. This supersedes the earlier plan language below that treated them as local-only drafts. Do not create, repair, or apply another production baseline until the current row-count/schema differences and out-of-band objects are reconciled with the owner.

An earlier linked CLI migration-list attempt failed during login-role initialization, and the owner later supplied a pending-only listing. The 2026-11-04 read-only retry succeeded and showed four applied versions. No migration push was run by this investigation; see the follow-up audit for current schema discrepancies.

## Secure preflight

1. Preserve the verified CLI login and link to the existing project; do not expose local tokens or database passwords.
2. Reconcile migration tracking in `auth` and `realtime` with the CLI's linked migration list and any repository/deployment records. The absence of `supabase_migrations.schema_migrations` is not proof that there is no deployed migration history.
3. Capture and securely review a schema-only dump for the intended project, if authorized access supports it. Keep dumps containing role metadata outside Git and sanitize before sharing.
4. Complete the pending read-only checks listed in `docs/supabase-live-schema-audit-results.md`, especially effective privileges for the actual migration/backend roles, Auth configuration, and Storage bucket settings.
5. Rehearse the draft in an isolated local/test project after schema and migration history are reconciled. Confirm target identity before any future production operation.

The CLI help was inspected for link, dump, and migration-list commands. `db dump` is a read operation; `db push`, `migration up`, `db reset`, and bucket/auth settings commands are not part of this phase.

## Proposed additive migration sequence

This ordering is conditional on live schema/catalog verification and a non-production rehearsal:

1. **Baseline only after secure dump:** reconcile CLI migration history and existing objects. If the remote schema has no managed migration history, prepare a reviewed baseline/repair procedure; do not mark production migrations applied without comparing exact object definitions.
2. **Catalog:** the local draft creates examinations with separate exam sections and academic subjects, plus subject chapters and topics. Current section and subject labels overlap, but no identity or one-to-one relationship is assumed. Map legacy strings only after reviewing duplicates/casing and the official exam blueprint.
3. **Trusted identity and audit:** profile/role lookup and audit log; reference existing Auth UUIDs. No account changes or administrator promotions. Role assignments begin empty except the ordinary student policy.
4. **Question revisions and media metadata:** add `question_revisions`, `media_assets`, and association tables. Keep `questions` legacy columns unchanged. The 2026-11-01 snapshot had 102 anon-visible rows, but a 2026-11-04 linked check found one total row; reconcile the baseline before any backfill.
5. **Student question features:** bookmarks, collections, reports, preferences; add owner FKs, uniqueness, and RLS after role and identity strategy is tested.
6. **Tests and PYQs:** tests, immutable test versions/sections/question mappings, and PYQ metadata/version mappings that reference existing question revisions.
7. **Attempts and results:** attempts, attempt question snapshots, answer state, single submission, results, and section results. Add transaction-safe uniqueness and owner/status constraints.
8. **RLS and grants:** add least-privilege grants and command-specific policies to new tables; change existing question/storage policies only after exporting and reviewing current policies. Never use a blanket permissive policy.
9. **Indexes/performance:** add FK and owner/status/time indexes. Add search indexes only after examining actual plans and data volume.

### Phase 6 trusted-role draft

`supabase/migrations/20261101010000_create_trusted_roles_and_admin_audit.sql` defines `roles`, `user_roles`, and `admin_audit_log`; seeds four design roles; uses a partial unique index for one active assignment; enables RLS without policies; and revokes default table/sequence privileges from `anon` and `authenticated` on its objects. The migration and smoke SQL passed a disposable Docker PostgreSQL 17.6 rehearsal on 2026-11-04. A local bootstrap harness passed missing-user refusal, atomic assignment/audit, audit-failure rollback, repeat refusal, and non-operator refusal; Auth Admin responses and UUID mismatch were mock-tested. The current linked production ledger records this migration applied, and the actual tables/columns and client denials were verified read-only. However, the owner-specified Auth UUID is absent, so no bootstrap can run. Keep trusted lookup disabled until the owner resolves the identity/count discrepancy and all runtime/backup checks are complete.

### Phase 8 test-engine draft

`supabase/migrations/20261101020000_create_test_engine.sql` depends on the Phase 6 `admin_audit_log` table and creates the authoring/version, attempt, answer, submission, and result objects. It uses the Auth UUID and legacy question bigint types, snapshots question content into test versions, enables RLS without policies, revokes direct client privileges, and protects published content with triggers. The migration and smoke SQL passed the disposable PostgreSQL 17.6 rehearsal on 2026-11-04. The current linked production ledger records it applied, but the live database has additional published-read policies and a `security_invoker` view not present in this migration; reconcile their provenance before further changes.

The backend implements test draft/version/publish and student attempt routes, with answer-key-free sessions, compare-and-swap answer writes, navigation flags, server-time deadline handling, and transactional idempotent scoring. A GET recovery after the deadline performs lazy timer submission; no scheduled worker is configured. Result and answer-review endpoints enforce each immutable version's release policy; pre-release requests return the same not-found response used for unavailable attempts. Keep these routes unavailable until trusted roles are enabled in a reviewed environment; the Phase 8 migration and smoke SQL passed the isolated PostgreSQL 17.6 rehearsal described below.

No new required columns are proposed on `questions` in the first pass; a revision table can reference its existing primary key using the actual type. If production constraints make that impossible, a nullable compatibility column requires a separate reviewed migration proposal.

## Phase 3 catalog migration review

### Hierarchy and status decisions

- The examination owns both `sections` and `subjects`; they are separate, with no imposed section-to-subject relationship. The supplied/live audit artifacts show the same four current labels in `questions.section` and `questions.subject`, while the JSON distribution gives section counts. Equal current labels do not establish identical concepts or a one-to-one rule. Exam sections represent the exam blueprint; subjects contain chapters and topics. `test_sections` are separately scoped to test versions.
- This agrees with the reviewed model in `docs/database-schema.md`: taxonomy uses `subjects -> chapters -> topics`; a future mapping will preserve the legacy `questions.section` dimension separately from subject/topic classification. No FK to `questions.id` is included until its exact type and the migration baseline are reconciled.
- Catalog status remains `active`/`inactive`: active means available for future selection; inactive retains the item but removes it from student-facing availability. Availability is inherited through all parents. Student-facing endpoints must require active examination, relevant section (where the question is mapped to one), subject, chapter, and topic as applicable. The SQL smoke test checks active descendants beneath inactive parents; actual FastAPI endpoint enforcement remains future work.

### Timestamps, constraints, and indexes

- FastAPI owns later `updated_at` changes: repositories must set the value explicitly in each update. PostgreSQL defaults both timestamps on insert. The migration installs no timestamp triggers. The smoke test verifies insert defaults, absence of user triggers, and an explicit application-style update; a repository-level test remains due when catalog write code exists.
- Every FK is non-null and uses `ON DELETE RESTRICT`. Each sibling code is unique within its parent; the examination code is globally unique. Names/codes must be non-empty after trimming, display order is non-negative, and status is constrained to `active`/`inactive`.
- Each table gets only its primary-key and unique-constraint indexes. Each unique index starts with the child FK column and supports FK lookup, so no duplicate FK indexes are added. No display-order/status indexes are justified until actual catalog query patterns and plans exist.

### RLS and privilege boundary

- RLS is enabled on all five newly created tables; FORCE RLS is not enabled. The migration adds no policies and revokes table privileges from `anon` and `authenticated` because production default ACLs otherwise grant direct access. Existing `questions` policies/grants are untouched.
- Expected access before a policy/grant migration: `anon` and `authenticated` see no catalog rows under RLS without policies; a non-bypass least-privilege backend role also sees no rows; the table owner can manage its tables. The verified production `service_role` has `BYPASSRLS`, so it can read/write only if its object privileges permit it; privileged backend use must still enforce authorization in FastAPI.
- The 2026-11-01 audit verified broad `postgres` and `supabase_admin` default ACLs. The 2026-11-04 linked check confirmed the current migration connection is `postgres`, database owner with RLS bypass, and confirmed the role tables deny direct anon/authenticated SELECT/INSERT. The deployed FastAPI runtime role remains unverified; no default privileges were changed by this work.

### PostgreSQL compatibility, naming, and migration state

- The migration uses PostgreSQL 17-supported built-ins and syntax. `gen_random_uuid()` resolves in `pg_catalog`; the disposable PG17.4 test succeeded without installing `pgcrypto`. No extension is required by this migration.
- The supplied public inventory contains only the existing `questions` table and `questions_id_seq`; the proposed relation names do not collide with that inventory. The migration deliberately omits `IF NOT EXISTS`, so a collision fails visibly instead of hiding drift.
- The 2026-11-04 read-only check found the standard migration ledger and the linked CLI listed all four local versions as applied. However, extra test policies and a `security_invoker` view are not represented by the local Phase 8 migration, and the questions/Auth counts differ from the previous audit. Reconcile these differences before any further production migration.

### Isolation rehearsal, failure, and rollback

- The earlier catalog draft was rehearsed in an in-memory disposable PostgreSQL 17.4 instance. On 2026-11-04, all four migrations (`20261101000000`, `20261101010000`, `20261101015000`, `20261101020000`) were applied in order to a fresh, network-isolated Docker PostgreSQL 17.6 database with synthetic Auth/API-role fixtures. The catalog, role, questions RLS, and test-engine smoke SQL files all passed. The bootstrap transaction harness separately passed missing-user refusal, audit-failure rollback with no partial rows, atomic assignment/audit, repeat refusal, and non-operator refusal.
- The disposable Docker PostgreSQL 17.6 rehearsal is not a Supabase stack. It validates syntax and fixture assertions, but Supabase-specific effective grants and production default ACL interactions still require catalog verification and operator review.
- There is no `IF NOT EXISTS`, so an unexpected object name causes an error. Supabase CLI migrations normally run transactionally unless explicitly marked otherwise; this file has no `transaction=false` directive. The isolated transaction rollback removed all five tables. A failed pre-deployment rehearsal should discard the disposable database; after any catalog data exists, recovery requires a reviewed restore/forward repair, not automatic dropping. See [Supabase migration workflow](https://supabase.com/docs/guides/local-development/cli-workflows).

The catalog migration intentionally contains no seed data, no references to `questions.id`, no Auth or Storage objects, and no policies. It enables RLS on its new tables and revokes direct table privileges from `anon` and `authenticated` to counter production defaults. Existing `questions` RLS and grants are unchanged. The updated draft passed disposable PostgreSQL 17.6 rehearsal; reconcile the current production count difference before future data work.

## Backward compatibility and preservation

- Do not rename/drop/truncate existing tables or columns.
- Keep the current student Auth project, providers, redirect settings, and user IDs.
- Preserve every `questions.id`, legacy option array, `correct_option`, explanation, status, and source field.
- Add new data in side tables with nullable relationships until the backfill is verified.
- Continue old read behavior until API parity is demonstrated; then switch clients gradually.
- Existing image object and signed URL remain untouched until a verified stable object path is available. New content stores media asset IDs/stable paths.
- No production schema, policy, bucket, account, or migration changes were made by this Codex work.

## Backfill validation

The 2026-11-01 baseline of 102 rows visible to anon is documented in `supabase-live-schema-audit.md`; the 2026-11-04 linked check returned one total question row. Reconcile the current baseline before further migration. Before/after comparison must include:

- Physical table count and PK uniqueness from authenticated SQL, not only anon-visible count.
- Exact ID set/hash and unchanged IDs.
- Prompt/option/explanation checksums or row-level comparisons within a protected environment.
- Four-option count and correct-index mapping, including explicit exception report.
- Status, exam/year/section/topic/source values.
- Media references and stable object existence, without copying signed tokens.
- Count of new revision mappings equal to eligible source rows; invalid rows listed individually by ID and reason.

No invalid row may be silently skipped or given an inferred answer.

## Verification queries and checks

Use `supabase-live-schema-audit.md` catalog queries before and after migrations. Also compare:

```sql
select count(*) as questions,
       count(distinct id) as unique_ids,
       min(id) as min_id,
       max(id) as max_id
from public.questions;

select status, count(*)
from public.questions
group by status order by status;

select count(*) as invalid_zero_based_answers
from public.questions
where correct_option < 0
   or correct_option >= jsonb_array_length(options::jsonb);
```

Adjust the options query only after verifying the live SQL type and JSON format. The current anon REST baseline is 102 visible published rows, IDs 3–106, four options per row, correct indexes 0–3; it is not a substitute for a full privileged baseline.

Run database-level RLS tests in an isolated local/test project with separate anon, student A, student B, editor, admin, and super-admin identities. Never seed test users or draft fixtures in production for this purpose.

## Rollback and recovery

- Before client cutover, rollback by disabling new API paths and dropping only newly created empty objects in the non-production environment. Keep legacy columns and policies untouched.
- After writes to new tables begin, prefer forward repair or app rollback while retaining new data. Do not delete user-generated rows to restore an old app version.
- Backfills are checkpointed and idempotent by `(question_id, revision_number)` and source hash. Failed rows remain unchanged in legacy storage with a remediation report.
- For policy rollout, keep a tested SQL export of existing policies/grants and a reviewed revert script in restricted change records. Apply one domain at a time.
- For Storage changes, no existing object is deleted/replaced; object cleanup is a separate audited job with dry-run and reference checks.

## Production deployment gate

Before any production migration, require: reviewed schema dump, verified migration history, non-production rehearsal, row-count/hash reconciliation, RLS tests, rollback procedure, backup/PITR confirmation, a named deployment window, and explicit approval. This plan stops before production changes.
