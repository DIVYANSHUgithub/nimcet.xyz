# Admin application

The separate Vite application lives in `admin/` and runs with `npm run admin:dev`. It reuses the existing Supabase Auth client and the `VITE_API_BASE_URL` configured at the workspace root.

## Authorization boundary

- Sign-in creates a Supabase Auth session; it does not grant administrative access.
- The app requests `/api/v1/auth/me` and renders the admin shell only when the backend response contains a trusted `editor`, `administrator`, or `super_administrator` role.
- The app does not read `user_metadata`, `app_metadata`, local storage role values, or other browser-controlled claims to decide access.
- API errors, unavailable backend configuration, invalid sessions, and student-only roles fail closed. The current shell has a read-only question-count dashboard, a super-administrator-only role assignment form, and a redacted recent role-audit list; question editing, media operations, and publication are not implemented.
- The FastAPI role resolver defaults to `student`. Database-backed role lookup is opt-in and must stay disabled until the role migration is reviewed, rehearsed, and deployed to the intended non-production database.
- Role grants and revocations require a reason and are written with an audit record in the same transaction. The backend rejects self role changes and prevents revoking the last super administrator. The first super-administrator bootstrap remains an out-of-band owner decision and is not automated.

## Enablement and remaining work

Configure the same public Supabase URL/anon key and API base URL used by the student app. The backend must have verified JWT settings before `/auth/me` can work. No admin URL should be deployed as a usable console until a non-production role assignment, authorization-denial tests, and protected endpoints exist.

The local role schema draft and role mutation routes are not production-ready. A linked read-only catalog query verified `auth.users.id` is UUID and found broad `postgres`/`supabase_admin` default privileges for new tables and sequences. The new-object drafts revoke table privileges from `anon` and `authenticated`; that revised SQL still needs rehearsal. Remaining gates: reconcile the complete migration ledger, verify the backend runtime role and effective privilege matrix, review JWT/Auth and Storage settings, rehearse the migration/API against disposable PostgreSQL 17 with RLS, and bootstrap the first super administrator using an owner-approved identity. Question edit/revision/publish APIs, media workflows, previews, and isolated end-to-end checks remain future work.
