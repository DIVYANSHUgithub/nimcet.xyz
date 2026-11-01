# Supabase Auth Configuration Audit

**Project:** `fchvtcnhabmnlfxsrzvu`  
**Audit date:** 1 November 2026

## Observed configuration

The current student app creates a Supabase JS client from frontend `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It implements:

- Email/password signup and sign-in.
- Email confirmation flow back to `/login`.
- Password reset email to `/reset-password` and password update through the recovery session.
- Google and GitHub OAuth buttons returning to `/questions`.
- Auth state restoration and sign-out through Supabase Auth.

The hosted public Auth settings endpoint returned:

- Email signup enabled.
- Email confirmation required.
- Provider names `email`, `google`, and `github` enabled.

This preserves the methods currently used by the application. Existing accounts were not read or modified. No role is granted based on signup metadata.

## Unverified hosted settings

The public Auth settings endpoint does not reveal the full dashboard configuration. The following still require an authenticated dashboard or Management API review:

- Site URL and exact redirect allow-list, including production and local origins.
- Password minimum/complexity policy and reset-email template/link expiry.
- OAuth client IDs, callback configuration, and secret rotation status.
- JWT signing algorithm/key rotation and the exact issuer/audience accepted for backend verification.
- MFA policy, rate limits, CAPTCHA, refresh-token policy, account deletion, and existing user identity/profile linkage.

### Expected redirect paths to confirm manually

The code uses same-origin redirects:

- Signup confirmation: `/login`.
- Recovery: `/reset-password`.
- Google/GitHub sign-in: `/questions`.

The production allow-list should include the exact deployed URLs under the production origin and approved local development URLs. Do not replace the production Site URL or remove existing URLs during this audit. Local `supabase/config.toml` now uses `http://localhost:5173` and the three app paths; this is local-only.

## JWT and backend identity expectations

- The issuer should be the hosted Supabase Auth issuer for the verified project URL, conventionally the project Auth URL ending in `/auth/v1`; confirm from a valid token's issuer or project Auth/JWT settings before backend configuration.
- The expected audience is commonly `authenticated` for Supabase user access tokens, but it was not verified from a token/configuration in this audit. Set `SUPABASE_JWT_AUDIENCE` only after verification.
- Verify signature, issuer, audience, expiry, and subject (`sub`) in FastAPI. Use the project's supported signing key/JWKS method and an allow-listed algorithm; do not accept an algorithm selected from untrusted token headers.
- Resolve the application user ID from verified `sub`. Profile and role assignments must reference that Auth identity. Never take a user ID or role from request JSON or mutable `user_metadata`.
- Keep all existing accounts and IDs. No account migration is planned.

## Trusted role model

Use server-controlled role assignments for `student`, `editor`, `administrator`, and `super_administrator`.

- A new user receives only the ordinary student capability through a trusted defaulting process; signup metadata cannot assign any role.
- Editors can edit authorized drafts, but cannot approve/publish by default.
- Administrators manage content, tests, PYQ papers, and scoped student workflows; they cannot grant themselves super-admin.
- Only a super administrator (or an out-of-band, audited break-glass operator) can grant/revoke elevated roles.
- Role change records require actor, target, old/new role, reason, and timestamp in an append-only audit log.
- Do not automatically promote any existing user. Initial elevated assignments must be manually reviewed and inserted through a controlled admin procedure after the role table exists.
- FastAPI checks trusted roles on every protected operation. RLS is a second boundary; UI route hiding is not authorization.

## Local configuration changes

- Local Auth site URL was aligned to Vite (`http://localhost:5173`).
- Local exact redirects cover `/questions`, `/login`, and `/reset-password`.
- Local email confirmations are enabled to match the hosted public setting.
- Local Google/GitHub OAuth credentials are not configured; no production provider settings were touched.

## Manual dashboard review checklist

1. Authentication → URL Configuration: record Site URL and all existing redirect URLs before any edit.
2. Authentication → Providers: confirm email, Google, and GitHub status; do not rotate client secrets during this audit.
3. Authentication → Email: confirm signup confirmation, recovery template, expiry, and SMTP configuration.
4. Authentication → Settings/Sessions: record password rules, JWT issuer/audience/signing mode, token expiry, refresh rotation, MFA, CAPTCHA, and rate limits.
5. Users: verify identity UUIDs remain the FK target. Do not export emails or modify accounts for this audit.
6. Record any required redirect/provider changes as a separate reviewed task; none were applied here.
