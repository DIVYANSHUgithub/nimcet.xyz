# Supabase Migration Plan

**Status:** Phase 3 catalog draft reviewed and rehearsed in disposable PostgreSQL 17.4. No migration has been applied to the Supabase local stack or production. Production application is not approved and remains gated.

## Baseline and production gate

The owner verified Supabase CLI authentication and project linking. A SELECT-only linked catalog query additionally verified exact `questions` constraints/indexes, `auth.users.id` UUID type, `questions_id_seq` identity settings, PostgreSQL 17.6, and default ACLs. It did not identify `supabase_migrations.schema_migrations`; metadata in `auth` and `realtime` does not establish the app migration ledger. Auth JWT configuration, bucket visibility/configuration, complete migration history, and the deployed backend role/mode remain pending.

Do not create or apply a production baseline until complete migration history and a schema dump have been reconciled. The local draft at `supabase/migrations/20261101000000_create_catalog_tables.sql` is a proposed additive catalog migration only; it does not represent production history and must not be marked as applied remotely without the required comparison and review.

The linked CLI migration-list attempt returned an error while initializing the login role (`DbConfigLoginRoleNetworkError: TransportError`) and returned no migration rows. No migration push was run. Migration history therefore remains unreconciled.

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
4. **Question revisions and media metadata:** add `question_revisions`, `media_assets`, and association tables. Keep `questions` legacy columns unchanged. Backfill the 102 anon-visible rows in batches only after the `questionImage` object is authenticated and verified.
5. **Student question features:** bookmarks, collections, reports, preferences; add owner FKs, uniqueness, and RLS after role and identity strategy is tested.
6. **Tests and PYQs:** tests, immutable test versions/sections/question mappings, and PYQ metadata/version mappings that reference existing question revisions.
7. **Attempts and results:** attempts, attempt question snapshots, answer state, single submission, results, and section results. Add transaction-safe uniqueness and owner/status constraints.
8. **RLS and grants:** add least-privilege grants and command-specific policies to new tables; change existing question/storage policies only after exporting and reviewing current policies. Never use a blanket permissive policy.
9. **Indexes/performance:** add FK and owner/status/time indexes. Add search indexes only after examining actual plans and data volume.

### Phase 6 trusted-role draft

`supabase/migrations/20261101010000_create_trusted_roles_and_admin_audit.sql` is a local draft only. It defines `roles`, `user_roles`, and `admin_audit_log`; seeds four design roles; uses a partial unique index for one active assignment; enables RLS without policies; and explicitly revokes default table/sequence privileges from `anon` and `authenticated` on only its new objects. The live audit verified `auth.users(id)` is UUID and showed why these revokes are needed. `supabase/tests/admin_roles_migration_smoke.sql` checks role seeds, RLS, zero policies, all client table privileges, sequence privileges, and the active-assignment index. The revised draft has not been run because this environment has no disposable PostgreSQL/Docker/Podman runtime. Do not enable the database role resolver or apply the migration until history, runtime privileges, bootstrap, and isolated rehearsal are complete.

### Phase 8 test-engine draft

`supabase/migrations/20261101020000_create_test_engine.sql` depends on the Phase 6 `admin_audit_log` table and creates the authoring/version, attempt, answer, submission, and result objects. It uses the verified Auth UUID and legacy question bigint types, snapshots legacy question content and answer indexes when an administrator creates a test version, enables RLS without policies, revokes direct client privileges from the new tables and trigger functions, and prevents updates/inserts/deletes against published test content. That snapshot is an interim path until immutable question revisions exist. `supabase/tests/test_engine_migration_smoke.sql` checks relation/RLS/policy state, client privilege denial, trigger availability, and the question FK. The SQL remains a local draft and has not been applied or rehearsed.

The backend implements test draft/version/publish and student attempt routes, with answer-key-free sessions, compare-and-swap answer writes, navigation flags, server-time deadline handling, and transactional idempotent scoring. A GET recovery after the deadline performs lazy timer submission; no scheduled worker is configured. Result and answer-review endpoints enforce each immutable version's release policy; pre-release requests return the same not-found response used for unavailable attempts. Keep these routes unavailable until Phase 6 trusted roles are enabled in a reviewed environment and the Phase 8 migration has passed an isolated PostgreSQL 17 rehearsal.

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
- The linked catalog audit verified that `postgres` default ACLs for `public` grant all table privileges (including PostgreSQL 17 `MAINTAIN`) and sequence `SELECT`/`UPDATE`/`USAGE` to `anon`, `authenticated`, `service_role`, and `postgres`. `supabase_admin` has similarly broad defaults. Explicit revokes remove direct client privileges from only the newly created catalog tables. The actual migration executor and runtime effective privileges still need an isolated Supabase-compatible rehearsal. No production default privileges were changed.

### PostgreSQL compatibility, naming, and migration state

- The migration uses PostgreSQL 17-supported built-ins and syntax. `gen_random_uuid()` resolves in `pg_catalog`; the disposable PG17.4 test succeeded without installing `pgcrypto`. No extension is required by this migration.
- The supplied public inventory contains only the existing `questions` table and `questions_id_seq`; the proposed relation names do not collide with that inventory. The migration deliberately omits `IF NOT EXISTS`, so a collision fails visibly instead of hiding drift.
- Complete migration history is unresolved. The provided audit found `auth` and `realtime` migration metadata but did not identify `supabase_migrations.schema_migrations`; the linked CLI listing failed before returning rows. Do not baseline, repair, or deploy until this is reconciled.

### Isolation rehearsal, failure, and rollback

- The earlier catalog draft was rehearsed in an in-memory disposable PostgreSQL 17.4 instance. That rehearsal did not include the newly added production-default-ACL revokes. The revised catalog and Phase 6 migrations have not been rehearsed. This environment has no local PostgreSQL, Docker, or Podman executable, so no claim is made that the updated scripts pass a PostgreSQL run.
- The earlier PGlite 17.4 rehearsal did not match production patch version 17.6 and is not a Supabase stack. Repeat with a disposable Supabase/PostgreSQL 17.6 environment before approval.
- There is no `IF NOT EXISTS`, so an unexpected object name causes an error. Supabase CLI migrations normally run transactionally unless explicitly marked otherwise; this file has no `transaction=false` directive. The isolated transaction rollback removed all five tables. A failed pre-deployment rehearsal should discard the disposable database; after any catalog data exists, recovery requires a reviewed restore/forward repair, not automatic dropping. See [Supabase migration workflow](https://supabase.com/docs/guides/local-development/cli-workflows).

The catalog draft intentionally contains no seed data, no references to `questions.id`, no Auth or Storage objects, and no policies. It enables RLS on its new tables and revokes direct table privileges from `anon` and `authenticated` to counter production defaults. Existing `questions` RLS and grants are unchanged. The actual migration executor's effective privileges and the updated draft still require isolated rehearsal before approval.

## Backward compatibility and preservation

- Do not rename/drop/truncate existing tables or columns.
- Keep the current student Auth project, providers, redirect settings, and user IDs.
- Preserve every `questions.id`, legacy option array, `correct_option`, explanation, status, and source field.
- Add new data in side tables with nullable relationships until the backfill is verified.
- Continue old read behavior until API parity is demonstrated; then switch clients gradually.
- Existing image object and signed URL remain untouched until a verified stable object path is available. New content stores media asset IDs/stable paths.
- No production schema changes, policy changes, bucket changes, account changes, or migration pushes in this phase.

## Backfill validation

For the 102 rows visible to anon, baseline facts are documented in `supabase-live-schema-audit.md`. Before/after comparison must include:

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
