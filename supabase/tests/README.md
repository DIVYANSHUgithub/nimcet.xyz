# Supabase database security tests

`rls_questions_smoke.sql` checks RLS enablement and anon visibility for the existing `public.questions` table. It is read-only and transaction-scoped.

`catalog_migration_smoke.sql` checks the new catalog migration's tables, constraints, indexes, RLS state, no-policy/no-trigger design, timestamp contract, status ancestry predicates, and client-role denials. It inserts temporary fixtures and grants temporary SELECT privileges, then rolls them back. Run it only in a disposable PostgreSQL 17 database with fixture roles `anon`, `authenticated`, `service_role` (BYPASSRLS), and `backend_runtime` present. The runner must set `application_name` to `nimcet_phase3_rehearsal`; the script rejects other session names and non-PostgreSQL-17 servers. **Never run it against production.**

The catalog migration and smoke test were previously rehearsed in an in-memory PostgreSQL 17.4 engine, not the production project. The production audit later confirmed broad `postgres` default privileges for `anon`, `authenticated`, and `service_role`; both local migration drafts now revoke direct table access from `anon` and `authenticated` on only the new tables (and the roles identity sequence). Rehearse the revised drafts in an isolated PostgreSQL 17/Supabase-compatible environment before approval.

`test_engine_migration_smoke.sql` is a read-only assertion script for the Phase 8 draft. It checks PostgreSQL 17, all ten tables' RLS state, absence of policies, immutability triggers, API-role ACL denials, internal trigger-function access, and the verified `bigint` question FK with `ON DELETE RESTRICT`. Run it only after applying the local test-engine draft to a disposable database with fixture roles; use `application_name=nimcet_phase8_rehearsal`. The draft has not been applied or rehearsed.

## Required RLS test cases as new domains are migrated

Use two independent authenticated test users (A and B), plus `anon`, `editor`, `administrator`, and `super_administrator` contexts. Seed fixtures only in a disposable database.

| Domain | Allow case | Denial case |
| --- | --- | --- |
| Published questions | anon/student can read published practice content | anon/student cannot read draft/unpublished content or administrative fields |
| Bookmarks | A creates/reads/deletes A's bookmark | A cannot read, update, or delete B's bookmark; duplicate bookmark rejected/idempotent |
| Collections | A manages own collection and membership | A cannot access B's collection or attach a question through B's collection ID |
| Attempts | A reads own active attempt | A cannot read B's attempt or substitute a different owner ID |
| Answers | A saves an answer to a question in A's active attempt | A cannot write to B's attempt, an unrelated question, a submitted attempt, or after deadline |
| Results | A reads own released result | B cannot read A's result; A cannot read before release; client role cannot insert score |
| Question administration | editor creates/edits authorized draft | student cannot write; editor cannot publish unless explicitly granted; admin publication is audited |
| Role management | super-admin assigns/revokes roles | student/editor/admin cannot self-promote or grant another user's role |
| Storage | authorized editor uploads approved media; student reads published asset | student upload/update/delete and unrelated-object overwrite are denied |

Tests must verify both SQL/RLS behavior and API authorization. The catalog status smoke test covers the database query predicate only; student-facing FastAPI endpoint tests are required when those endpoints are implemented. RLS does not replace server checks for attempt timing, scoring, or publication policy.
