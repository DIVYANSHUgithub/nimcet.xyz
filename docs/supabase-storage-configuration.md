# Supabase Storage Configuration Audit

**Project:** `fchvtcnhabmnlfxsrzvu`  
**Known existing bucket:** `questionImage` (provided by owner)  
**Audit date:** 1 November 2026

## Current evidence

- No Storage client/upload code exists in the repository.
- The hosted anon bucket-list endpoint returned HTTP 200 but did not list `questionImage`; requesting bucket metadata by name returned HTTP 400. These responses do not reveal whether the bucket is public/private or its limits/policies.
- Bucket visibility, size limit, allowed MIME types, Storage policies, object inventory, and ownership could not be inspected without authenticated project access.
- One question (`id=69`) contains a persisted signed URL under the `questionImage` bucket path `Screenshot 2026-11-01 010954.png`. A HEAD check returned HTTP 200 at audit time. The signed token and full URL are intentionally not recorded.
- No existing objects were listed, moved, replaced, or deleted. Bucket visibility was not changed.

The valid signed URL is evidence of a temporary URL embedded in a question record. It does not prove the object is public or that the URL will remain valid. New records must store the stable bucket and object path (or a media asset ID that resolves to them), never a signed URL.

## Proposed media model

1. Preserve `questionImage` and all its objects. First inspect its actual visibility, constraints, policies, and referenced object paths in the dashboard/Management API.
2. Reuse `questionImage` for existing and approved question/option image assets only if its current policy and limits meet requirements. Do not loosen or change visibility as part of reuse.
3. Store media metadata in a backend-controlled `media_assets` table: asset ID, bucket, object path, MIME, byte size, hash when available, state, visibility, uploader, and timestamps.
4. Rich-content blocks reference the asset ID. Backend resolves the bucket/path and creates an accessible URL at request time. Signed URL expiry values are never persisted.
5. Support diagrams as approved image formats. Audio/video and private attachments need explicit MIME/size rules and likely a separate private bucket after manual configuration; do not create buckets until access class and policy are reviewed.
6. Reject executable HTML and unsanitized SVG. Validate extension, sniffed MIME, file signature, size, and object path server-side.
7. Upload workflow: authorized editor request → pending asset and generated path → short-lived upload authorization or backend proxy → backend verifies object → mark ready → attach to immutable question revision.
8. Replacement/deletion workflow checks all references. Mark pending deletion, remove only after no content references remain, and record a retryable audit event. No client-provided path may select an arbitrary object for deletion.

## Proposed access policy

- Student access: read media referenced by published questions according to the bucket's verified public/private policy; no list, upload, update, or delete permission.
- Editor/admin access: upload/update only through backend authorization and generated paths. Only authorized editors can attach an asset to content they can edit.
- Deletion: administrator/editor scope with reference checks and audit. The browser never receives broad bucket write permissions.
- Private media: backend-issued short-lived signed read URLs after content/attempt authorization. Never put such URLs in question rows or long-lived caches.
- Storage policies must align with database authorization; an object path prefix alone is not proof of role unless the policy derives a trusted user identity and the prefix is generated server-side.

## Manual dashboard inspection required

For `questionImage`, record before any change:

- Public/private setting.
- Maximum file size and allowed MIME list.
- Exact `storage.objects` policies and grants (including SELECT/INSERT/UPDATE/DELETE).
- Object count, key listing, and any paths referenced by question rows.
- Whether current references are stable `/object/public/...` paths or signed `/object/sign/...?...token=...` URLs.
- Existing lifecycle/versioning/CDN behavior if enabled.

No bucket configuration or object operation was performed in this phase.
