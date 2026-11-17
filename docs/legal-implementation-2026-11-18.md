# Legal pages implementation report — 18 November 2026

## Result and scope

Implemented public `/privacy-policy`, `/terms` and `/contact` in the existing React/Vite student application. Existing Navbar/Footer and design tokens are reused. Pages have dated content, section navigation, semantic headings, keyboard focus, responsive widths, email links, canonical URLs and descriptions. All three documents are also rendered to static HTML during the production build, using the same React components. Vercel rewrites serve those documents before the existing SPA fallback. No new dependencies were introduced.

Operator details and refund direction supplied in the chat were incorporated. Publication remains subject to the [separate operator/legal checklist](legal-publication-checklist.md). No deployment, Google credential/redirect change, schema change, user-record read or database mutation was performed.

## Repository inspection

- Actual Git root is `app/nimcet.xyz` within the workspace. Existing tracked modifications and untracked development work were recorded and preserved, including `SocialLogin.jsx` and historical audit documents.
- No applicable project `AGENTS.md` was found outside installed dependencies. Dependency instructions were not applied to application code.
- Student app: React 19, React Router, Vite, Tailwind v4, Supabase JS, shared page-level Navbar/Footer. Routes are defined in `clientFront/src/App.jsx`; private tests/results use `RequireSession`.
- Backend: Python/FastAPI, bearer-token verification and SQLAlchemy/Postgres repositories; independently hosted, not implemented as Vercel functions.
- Admin: separate React/Vite application using the shared Supabase auth context and backend role checks. Only legal navigation and its styles were added.
- Configuration: `clientFront/vercel.json` supplies frontend build/output, security headers and SPA rewrites. `render.yaml` describes a Render backend preview, not a verified production backend deployment.
- No previous legal/contact pages were found. Existing student public and signed-in catalog/results pages already used the shared Footer. The focused timed-attempt UI was left unchanged; legal links remain available in its surrounding test catalog and results flows. The separate admin app now links to the public canonical legal URLs.
- The app has light design tokens but no supported global dark-theme toggle or dark palette. Legal styling uses the same tokens and adds no theme mechanism.

## Actual data inventory

Evidence levels: **code** means directly inspected implementation; **live metadata** means read-only Supabase schema/policy/storage metadata or public HTTP checks; **operator** means supplied in this chat; **unknown** means not established. No private user rows were inspected.

| Data category | Collected? | Purpose | Storage/provider | Retention |
|---|---|---|---|---|
| Full name, email, optional username | Yes, code: `Signup.jsx` and signup form | Register/contact and identify account | Supabase Auth metadata and user record | No application TTL found; deletion procedure unresolved |
| Password for email accounts | Yes, passed to Supabase Auth; not a custom application password table | Email sign-in and recovery | Supabase Auth manages credentials | Auth/provider lifecycle; no application retention period verified |
| Google identifier, name, email, picture URL | Basic profile flow implemented; fields depend on provider response | Sign-in and account identity | Supabase Auth identity/metadata, browser session | Account/provider lifecycle; no fixed period verified |
| GitHub identity/profile | Sign-in button and provider call exist; enablement/actual usage unverified | Optional social sign-in | GitHub → Supabase Auth/session | Unknown provider/account retention |
| Supabase user ID, verification, creation/last-sign-in metadata | Yes, code; admin directory projection where enabled | Ownership/authentication/account administration | Supabase Auth; backend processes relevant identifiers | No automatic account purge found |
| Access/refresh tokens and session identifiers | Yes, code and installed SDK defaults | Restore/refresh session; authorise API requests | Browser local storage, Supabase Auth; bearer access token to API | SDK sign-out/expiry/refresh lifecycle; provider settings not audited |
| Question search/filter/access requests | Yes, requests; no separate persistent per-user question-browse history found | Return practice resources | Backend or direct Supabase mode | Request/log retention unknown; practice state can be browser-only |
| Attempts, test/version IDs, selected answers | Yes, schema and API code | Save/resume/evaluate attempts | Supabase Postgres | No TTL; linked submission/result restrictions affect deletion |
| Visited/review/current question state and attempt times | Yes, code/schema | Navigation, timing, autosave and resumption | Supabase Postgres | No automatic expiry-to-deletion job found |
| Scores, section results, history and summaries | Yes, code/schema; some richer analysis is feature-gated | Results/review/progress | Supabase Postgres; computed backend summaries | No TTL; persistent submitted records |
| Free/paid purchase entitlements or subscriptions | No checkout/entitlement implementation or tables found in inspected code/live public schema | Future paid-service business intention only | None identified | Not applicable to current implementation; future policy needed |
| Payment/card/UPI records | No integrated payment API/SDK/webhook or transaction table found | No current checkout | No provider identified; manual/off-platform arrangements unknown | Future decision; support emails can contain voluntarily supplied references |
| Roles/account status and admin action audit | Roles/audit live; account-status workflow only in pending code/migrations | Privilege checks, abuse handling, accountable administration | Postgres; optional Supabase Auth admin directory | No TTL; actor FK may become null while event/JSON survives |
| Question images/upload metadata | Supabase Storage bucket exists live; richer authoring paths are feature-gated | Educational media delivery and authoring | Public `NIMCET-Media` bucket; pending backend default is `question-media` | No verified automatic object purge; uploaded object paths can include author IDs |
| Application request logs | Yes, code | Troubleshooting/reliability | Backend logger: request ID, method, path, status, duration, timestamp | Host retention unknown; query strings/bodies/headers are excluded by custom middleware |
| IP/browser/device/network information | Providers receive connection metadata; no custom device-fingerprint collector found | Request delivery/authentication/security | Supabase, Google/GitHub when chosen, Vercel, backend host, Google Fonts | Provider log settings not verified; do not claim no IP collection |
| Cookies | No custom app cookie writer found; provider/infrastructure behaviour not exhaustively verified | Provider sign-in/security as applicable | Provider domains/browser | Provider-controlled; do not claim cookie-free operation |
| External analytics/advertising | No SDK/snippet found in source/package/HTML inspection | None identified | Internal performance summaries are test-data processing, not external analytics | Hosting dashboard toggles cannot be inferred from source |
| Support email and attachments | Yes when voluntarily sent (operator-provided Gmail address) | Support, refund review, privacy and complaints | Gmail and sender's email provider | No mailbox retention period supplied |
| Backups and infrastructure/error logs | Expected provider capability; actual plan/settings unknown | Recovery/operations/security | Supabase/hosting/email infrastructure | Unknown; no immediate-all-copies-deletion promise |

Principal evidence: `clientFront/src/pages/{Signup,Login,QuestionDetail,TestAttempt}.jsx`, `components/auth/SocialLogin.jsx`, `context/AuthContext.jsx`, `lib/{supabase,backendApi,questionsApi,testsApi}.js`, `index.html`; backend `main.py`, `core/{security,logging}.py`, `services/auth_directory.py`, `db/{test_engine,roles,operations,content}.py` and API routes; all Supabase migrations, production schema and local auth configuration.

## Live metadata and deletion findings

The connected NIMCET.XYZ project was identified by name and matching repository project reference. Read-only catalog queries confirmed RLS on all 19 current public tables. Browser SELECT policies exist for published questions and published test content; the runtime role has explicit policies. Student attempt ownership is enforced in backend repositories. This observation is not a complete security certification or an assertion that each current grant is minimal.

Live schema lacks `question_media`, `question_occurrences`, `pyq_papers` and `account_status` from later local migrations. Live Storage has public `NIMCET-Media`; that is different from the newer backend's configured default bucket name. The policy therefore distinguishes configured media features from the live baseline.

Live `test_attempts.user_id → auth.users` cascades; `attempt_questions` and `attempt_answers` also cascade downwards. However `test_submissions → test_attempts`, `test_results → test_submissions` and `section_results → test_submissions` use `ON DELETE RESTRICT`, which can prevent account deletion for submitted attempts. `user_roles` cascades while audit actor IDs become null. Audit payloads can retain historical details. Later migrations add immutable result/answer triggers, absent in the live result-trigger metadata checked here. These cannot be ignored when designing deletion.

No account-delete UI or auth-user deletion endpoint, scheduled account/test cleanup, contact-message delivery integration or fixed retention policy was found. An email contact route is used instead of a pretend submission form. Privacy rights requests explain identity verification, review and limitations without promising an unimplemented deletion capability.

## Third parties and Google OAuth

Verified in code: Supabase Auth/Database, conditional Supabase Storage paths, Google/GitHub OAuth calls, Google Fonts, Gmail mailto contact. Supabase storage existence was confirmed through metadata. Vercel is operator-stated hosting with repository deployment configuration; the production account/log configuration was not inspected. Render is only verified as a repository preview deployment configuration. No payment provider, external analytics SDK or unrelated external API was identified.

A read-only request to the hosted Supabase Google authorisation endpoint returned HTTP 302 to `accounts.google.com` with **`email profile`** scopes. Only status, provider hostname and scope names were output; client IDs, state, credentials and complete redirect URLs were not logged. No Google sign-in was completed. Actual audience, Testing/Production status, branding verification, user field population and account-level settings remain unverified. See the [publication checklist](legal-publication-checklist.md) for current Google policy links and Testing-mode exceptions.

After deployment, the exact Branding values are:

| Field | URL |
|---|---|
| Application home page | https://nimcet.xyz |
| Privacy policy | https://nimcet.xyz/privacy-policy |
| Terms of service | https://nimcet.xyz/terms |
| Support/contact page | https://nimcet.xyz/contact |

These are branding links, not OAuth callback/redirect URI replacements. Keep existing credentials and redirect configuration unchanged unless separately verified necessary.

## Legal content

Privacy covers the individual operator, registration and provider identities, learning records, local storage/tokens/cookies, operational logs, service providers, storage/security/sharing, future payments, retention/deletion limits, privacy requests, children, external links, changes and complaints. Terms cover independence from NIMCET authorities, accounts, free resources, future paid access limits, the operator's refund-review direction, content/IP restrictions, integrity, timing/results, availability, proportionate suspension, privacy, Indian law and mandatory consumer remedies. Contact provides all nine requested support categories with safe email guidance and the supplied identity/address.

Current/upcoming Indian legal requirements and legal questions requiring professional review are documented separately, including the DPDP phase schedule and the 2026 e-commerce amendment's 1 January 2027 commencement. No fully compliant claim or invented statutory appointment is made.

## Files created by this task

1. `clientFront/src/lib/legal.js`
2. `clientFront/src/components/legal/LegalLayout.jsx`
3. `clientFront/src/components/legal/LegalSection.jsx`
4. `clientFront/src/components/legal/LegalEmail.jsx`
5. `clientFront/src/components/legal/OperatorDetails.jsx`
6. `clientFront/src/components/legal/legal.css`
7. `clientFront/src/pages/PrivacyPolicy.jsx`
8. `clientFront/src/pages/Terms.jsx`
9. `clientFront/src/pages/Contact.jsx`
10. `clientFront/scripts/prerender-legal.mjs`
11. `clientFront/scripts/check-legal-pages.mjs`
12. `docs/legal-operator-decisions.json`
13. `docs/legal-publication-checklist.md`
14. `docs/legal-implementation-2026-11-18.md`

## Files modified by this task

1. `clientFront/src/App.jsx` — public lazy-loaded routes.
2. `clientFront/src/components/Footer.jsx` — legal links and official email.
3. `clientFront/src/lib/navigation.js` — legal route titles, including trailing slash handling.
4. `clientFront/src/index.css` — shared legal stylesheet import.
5. `clientFront/package.json` — prerender in both production build paths; legal verification command.
6. `clientFront/vercel.json` — three static legal rewrites before SPA fallback.
7. `admin/adminFront/src/AdminApp.jsx` — public canonical legal navigation.
8. `admin/adminFront/src/admin.css` — small wrapping/focus styles for those links.
9. `clientFront/src/main.jsx` — hand static metadata ownership to React on startup so SPA navigation does not retain duplicate descriptions/canonicals.

Generated ignored artifacts: frontend/admin `dist` outputs. Other pre-existing changes shown in Git status are not part of this task.

## Verification results

| Check | Actual result |
|---|---|
| Client `npm run lint` | Passed |
| Client `npm test` | 29 passed; existing Node module-type warnings only |
| Client `npm run build` | Passed; three static HTML documents generated |
| Client `npm run test:legal` | All three routes passed in the actual App with no session or environment files; headings, single footer, section anchors, email, canonical/description/title/date, SPA navigation, built HTML/assets and Vercel rewrite ordering checked |
| Test workflow `npm run test:workflow` | 23 synthetic interactive React checks passed: answer changes/clear, autosave, resume, failure/reconnect and submission ordering |
| Existing social-login script | Passed synthetic provider/error/retry/Back restoration checks; expected synthetic error logged, not a live OAuth failure |
| Admin `npm run lint` / `npm run build` | Both passed |
| Backend pytest | 165 passed in 11.18 seconds outside the restricted sandbox; the first sandboxed run stalled and was stopped |
| Local HTTP preview | `/`, `/privacy-policy`, `/terms`, `/contact` returned 200. Legal routes contained complete static document content and correct route-specific title before JavaScript |
| Google authorisation initiation | Live 302 to Google with email/profile scopes confirmed; no end-to-end consent/login performed |
| Production domain | Mixed reachability: home/privacy timed out; terms/contact returned 200 with the old generic SPA title. New implementation is not deployed, so these responses are not proof of the new pages |
| Desktop/tablet/mobile screenshots and browser console | Not verified: browser automation timed out twice during initialisation. Responsive CSS/semantic DOM reviewed; no screenshot or real-layout claim made |
| React console during legal DOM checks | No errors |
| Private-value artifact scan | 48 built HTML/JS/JSON files checked against locally configured private backend values; no matches (values were never printed) |
| Diff whitespace check | Passed; existing CRLF normalisation notices only |
| Type checking | No separate TypeScript/type-check command exists in either JavaScript app |

The existing test suite covers question and admin authorisation logic. No live user login, test attempt, payment, refund or admin mutation was performed. No real paid access can be verified because there is no implemented payment/entitlement path. These limits should remain part of release acceptance rather than being reported as passed live checks.

Verification caught and corrected two integration details: static documents needed explicit canonical-route rewrites before the SPA fallback, and prerendered head metadata needed a startup handoff to React to avoid duplicate descriptions/canonicals during client navigation. The legal checker now starts from the built static document before mounting the real anonymous App, then follows links to another legal page. Initial failed checks were fixed and rerun; the table reports final successful checks.

## Deployment status

Code builds locally and is prepared for the existing Vercel layout: Root Directory `clientFront` relative to Git root, `npm run build:deploy`, output `dist`. That command retains the existing deployment environment gate and now invokes the prerendered production build. Supply the correct production public API/Supabase settings and retain the backend's existing deployment/security checks. A successful development build is not verification of production environment values.

Review the [operator checklist](legal-publication-checklist.md), resolve applicable mandatory grievance/contact disclosures and other publication blockers, then deploy only with authorisation. Verify fresh direct HTTPS requests to every canonical URL, metadata/content without JavaScript, navigation from home/login/questions/tests/results/admin, actual Google sign-in and hosted backend workflows after deployment. The static documents and ordinary SPA routes share the same page components, avoiding a separate policy copy to maintain.
