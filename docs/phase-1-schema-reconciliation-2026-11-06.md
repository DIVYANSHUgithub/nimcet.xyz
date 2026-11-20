# Phase 1 Schema Reconciliation — 2026-11-06

**Scope:** local design reconciliation against read-only Supabase catalog metadata for project `wcxxyyebcgofziylgwdg`.
**Change boundary:** documentation only. No production SQL, application data, policies, grants, Auth, Storage, or migration history were changed.

## Verified live facts

- The project is active in `ap-south-1`, running PostgreSQL 17.11. The live migration ledger contains the four migration versions present in this checkout.
- The live public catalog contains the catalog, role/audit, question, and test-engine tables described in the Phase 0 audit. The current detailed relation/column inventory was read with the Supabase table metadata tool.
- Live catalog taxonomy is `examinations → subjects → chapters → topics`. `sections` is a separate child of `examinations`. The relations currently report zero catalog rows.
- `questions.id` is `bigint`; `questions.subject` and `questions.topic` remain legacy text labels. The test-question relation references the legacy question ID.
- All four local migrations are recorded as applied, but live policies and the `public_test_questions` view include additions not represented in those files. See `phase-0-audit-2026-11-05.md` for security details.
- The owner selected the Supabase direct connection as the intended backend connection mode. The local ignored backend URI is still not a verified usable direct endpoint: it targets a different host, uses a placeholder password, and does not specify TLS. Runtime DB connectivity and role grants remain unverified.

## Target taxonomy and compatibility decision

Use `Subject → Topic → Subtopic` as the product/API vocabulary. Preserve the deployed `chapters` and `topics` relations and their keys during compatibility rollout. Treat the existing `chapters` level as the legacy storage counterpart of target `Topic`, and existing `topics` as the legacy storage counterpart of target `Subtopic`; this is a naming bridge, not a claim that every current label has already been semantically reviewed.

Before any data migration or write path is proposed, owners/editors must review the existing catalog values and approve the mapping. New API responses may expose target names through an adapter only after this mapping is accepted. Do not rename/drop relations, rewrite labels, auto-create taxonomy from question strings, or add taxonomy FKs to `questions` as part of this design phase. Keep legacy `questions.subject`/`questions.topic` readable until a separately reviewed, tested backfill and rollback plan exists.

Keep examination `sections` independent from the academic hierarchy. A matching section and subject label does not prove a structural relationship; do not add a section-to-subject FK without an authoritative exam blueprint.

## Reconciled design boundaries

| Area | Verified today | Design direction | Gate before implementation |
| --- | --- | --- | --- |
| Question identity | `questions.id bigint`; tests reference it | Preserve the key and use the exact type in every FK | Isolated migration rehearsal and compatibility review |
| Taxonomy | `subjects → chapters → topics`; no catalog rows | API vocabulary `subjects → topics → subtopics`, bridged to deployed names | Owner/editor approval of actual labels and mapping |
| Correct answers | Legacy `correct_option integer`; published rows are publicly readable under current policy | Never expose answer keys from active practice/test payloads; API projection is not a replacement for an approved DB security boundary | Review and approve concrete policy/view/API remediation before production changes |
| Test engine | Test tables/migration exist; live policies/view drift from local migration history | Keep immutable version and attempt design; reconcile local/live policy and view definitions | Read-only definition comparison, isolated migration replay, explicit production change approval |
| Database runtime | Direct connection selected; local URI is not valid for the intended target | Dedicated least-privilege server runtime role over TLS; no frontend service credential | Secure local configuration and verify endpoint, `current_user`, grants, TLS, and readiness |
| Trusted role lookup | Role schema exists; feature flag remains disabled | Enable only after runtime role and grants are verified and role behavior is integration-tested | Separate role/security review and explicit production approval |

## Phase 1 exit assessment

The logical architecture and API/schema proposal are reviewable and now include a compatibility map grounded in the live catalog. Phase 1 is complete for design reconciliation. Database migration authoring, backend DB integration, public answer-key remediation, production role changes, and first-owner bootstrap remain later gated operations; this document does not authorize them.

## Next implementation-ready work

1. Review/approve taxonomy label mapping without changing live rows.
2. Compare live view, policy, and grant definitions to local migrations and prepare a separate security change proposal.
3. Configure the ignored backend environment locally with the verified direct endpoint, a least-privilege runtime credential, and TLS; keep secrets out of tracked files and chat.
4. Rehearse only additive schema changes in an isolated PostgreSQL 17/Supabase-compatible environment before proposing any production migration.
