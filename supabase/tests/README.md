# Supabase database security tests

`rls_questions_smoke.sql` checks RLS enablement and anon visibility for the existing `public.questions` table. It is read-only and transaction-scoped.

`catalog_migration_smoke.sql` checks the new catalog migration's tables, constraints, indexes, RLS state, no-policy/no-trigger design, timestamp contract, status ancestry predicates, and client-role denials. It inserts temporary fixtures and grants temporary SELECT privileges, then rolls them back. Run it only in a disposable PostgreSQL 17 database with fixture roles `anon`, `authenticated`, `service_role` (BYPASSRLS), and `backend_runtime` present. The runner must set `application_name` to `nimcet_phase3_rehearsal`; the script rejects other session names and non-PostgreSQL-17 servers. **Never run it against production.**

On 2026-11-04, all four migrations (catalog, trusted roles/audit, questions baseline, and test engine) and their four smoke SQL files passed in order in a fresh, network-isolated Docker PostgreSQL 17.6 database with synthetic Auth/API-role fixtures. This is not a Supabase stack, so production default ACLs and runtime-role behavior still require separate verification.

`test_engine_migration_smoke.sql` is a read-only assertion script for the Phase 8 migration. It checks PostgreSQL 17, all ten tables' RLS state, absence of policies, immutability triggers, API-role ACL denials, internal trigger-function access, and the `bigint` question FK with `ON DELETE RESTRICT`. Run it only in a disposable database with fixture roles; use `application_name=nimcet_phase8_rehearsal`. The 2026-11-04 disposable rehearsal passed; the production database has additional policies outside this migration that require provenance review.

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
