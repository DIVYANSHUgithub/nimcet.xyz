# Phase 1.5 Supabase Configuration Audit — 2026-11-06

**Scope:** read-only project/database review and local configuration reconciliation.
**Project:** `wcxxyyebcgofziylgwdg` (`NIMCET.XYZ`).
**Change boundary:** no production writes, Auth/Storage settings, migration changes, or data reads were performed. Storage review queried bucket metadata and object counts only; it did not list or read object names/content.

## Verified

- Project status is `ACTIVE_HEALTHY`, region `ap-south-1`, PostgreSQL 17.11. The direct database host is `db.wcxxyyebcgofziylgwdg.supabase.co`.
- The live migration ledger contains these four versions, matching local migration filenames: `20261101000000`, `20261101010000`, `20261101015000`, `20261101020000`.
- Storage has one bucket, `NIMCET-Media`. It is public, contains zero objects, and has no configured file-size or MIME-type limits. `storage.objects` has RLS enabled, `FORCE ROW LEVEL SECURITY` disabled, and no policies.
- The repository's local JWT issuer, JWKS URL, audience, mode, and algorithm were checked without exposing secret values and match the project URL and supplied settings.
- The ignored local backend `DATABASE_URL` still does not target the verified direct host, contains a placeholder password, and does not specify TLS. It was not used. Backend readiness and live DB authentication remain unverified.

## Not verified / requires dashboard or secure local access

- Supabase Auth provider enablement, redirect allowlist, site URL, signup confirmation settings, and hosted JWT signing configuration were not exposed by the available read-only project/database tools. A matching local JWKS URL does not establish the hosted Auth settings.
- The direct endpoint's network reachability from the backend runtime, the credential's actual role/grants, and TLS/CA behavior remain unverified. Configure a dedicated least-privilege runtime login locally from the project's Connect panel; do not send credentials in chat or track them.
- The public Storage bucket currently has no objects or object policies. Before any media upload workflow, review whether public delivery is intended, set size/MIME restrictions, and approve a narrow policy design. No bucket setting was changed.

## Gate

Phase 1.5 is complete for read-only migration-ledger and Storage inventory. It remains open for Auth dashboard review and runtime database verification. No production migration, policy, grant, bucket, Auth, or role change is authorized by this audit.
