# NIMCET.XYZ Architecture Audit

**Audit scope:** repository checkout only, inspected 1 November 2026.  
**Branch:** `codex/phase-0-architecture-audit`  
**Verification limit:** the initial sandboxed schema request could not reach Supabase. A later authorized read-only anon REST check observed `public.questions` rows and public Auth settings, but did not expose catalog definitions or policies. Full live schema, Storage settings, Vercel settings, and production administration access remain unavailable. Database details below are labeled by source and must be confirmed before migrations.

## Executive summary

This repository is a single React 19 and Vite 8 student-facing SPA. It uses Supabase Auth directly in the browser and reads published questions directly from the Supabase `questions` table with the anon key. It has a styled home page, account flows, published question browsing/details, and math rendering. There is no FastAPI backend, admin frontend, database migration directory, test engine, bookmark persistence, or PYQ system in the repository.

The current app is a useful foundation and should remain in place while backend capabilities are introduced alongside it. The first implementation steps should preserve the existing auth project and question records, establish a verifiable schema snapshot, and add a backend that can read the existing table before moving protected writes and examination operations behind it. Do not migrate or reinterpret `correct_option` until existing rows and its semantics have been checked against the live database.

## Repository and deployment inventory

- Root contains one Vite application (`src/`, `public/`, `index.html`) and npm scripts for `dev`, `build`, `lint`, `test`, and `preview`.
- Runtime dependencies include React, React Router, Supabase JS, KaTeX/react-katex, and Lucide/React Icons. No Python or backend dependencies are present.
- `.env.example` declares only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are browser-exposed public configuration values. `.env*` local files are ignored by Git.
- `vercel.json` rewrites every path to `/index.html`, supporting the SPA route fallback. No Vercel project/build settings or deployment secrets are included.
- No admin app, `backend/`, database migration files, schema dump, Supabase config, or database documentation directory was found in the tracked repository inventory.
- Git was clean on `main` before this audit. Work is now on `codex/phase-0-architecture-audit`.

## Existing routes and feature inventory

Routes defined in `src/App.jsx`:

| Route | Current behavior |
| --- | --- |
| `/` | Home page, subject exploration, daily/random question modules and learning calls to action |
| `/questions` | Published question list with server-side filtering, search, sorting, and numbered pagination |
| `/questions/:questionId` | Published question detail, including answer and explanation |
| `/login` | Email/password login, password recovery request, Google/GitHub OAuth entry points |
| `/signup` | Email signup with full name and username in Auth user metadata; OAuth entry points |
| `/reset-password` | Auth recovery session password update |
| `*` | Not-found page |

Navigation mentions PYQs and tests, but they currently show “unavailable” notices. Chapter filtering is explicitly unavailable. Bookmark and attempted-question actions do not persist. No student dashboard, test-taking, result, collection, report, admin, or role-management routes exist.

## Authentication and authorization flow

- `src/lib/supabase.js` creates a browser Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, or leaves it unconfigured when either is missing.
- `AuthProvider` subscribes to Supabase Auth state changes and restores the session with `getSession()`; pages call Supabase Auth methods directly for sign-in, signup, OAuth, password reset, and sign-out.
- Email signup stores `full_name` and `username` in Auth user metadata. This checkout has no profile table or username uniqueness enforcement. OAuth users do not go through the username form.
- No backend token verification, backend roles, authorization middleware, admin guards, or role/ownership policies are present in application code.
- Supabase RLS and Auth provider/redirect configuration cannot be verified from repository files. The README provides setup guidance but is not evidence of current live settings.

## Question data and rendering flow

1. `QuestionBank` and question-related home components call `src/lib/questionsApi.js`.
2. The browser client queries `questions`, selects `*`, filters `status = 'published'`, and uses PostgREST range pagination (default 10 rows, page size capped at 100).
3. Available filters include subject, topic substring, difficulty (including null), MCQ presence, exam year, and text search across question/topic/subject/section. Sorting supports question number or creation date.
4. `normalizeQuestion` converts legacy rows to a browser model. It parses `options` as an array or JSON string, treats `correct_option` as a zero-based integer index, and derives the answer text. Question and option display use the shared KaTeX-based `MathText` component; content is currently plain strings with embedded math delimiters, not validated structured blocks.
5. Detail lookup is by ID and also selects `*` for published questions. The detail page renders the correct answer and explanation.
6. The question bank aborts stale fetches on effect cleanup and supports retry. It uses numbered pagination, not an IntersectionObserver feed.

The existing code therefore uses one central question table, which aligns with the requested reuse model. It does not yet support independently identified mixed-content options or stable media references.

## Database inventory and confidence

No migration, DDL, generated types, or full database catalog inspection artifact exists in this checkout. An anon REST read later verified the `questions` response keys and 102 anon-visible rows, but SQL types, constraints, RLS, and hidden rows remain unknown. `README.md` documents the inspected `questions` columns as:

`id`, `exam`, `exam_year`, `section`, `question_number`, `question`, `options`, `correct_option`, `explanation`, `subject`, `topic`, `difficulty`, `source`, `status`, and `created_at`.

The README also states that the current table has no `chapter`, question type, popularity/importance classification, or attempt-count field, and that `correct_option` is zero-based. These are repository documentation claims, not independently verified live schema facts. Application code relies on at least `id`, `status`, `subject`, `topic`, `difficulty`, `options`, `exam_year`, `question`, `section`, `question_number`, `created_at`, `correct_option`, `explanation`, `exam`, and `source`.

No other database tables or constraints can be established from source. Existing user accounts are held by Supabase Auth, but the project cannot inspect the Auth database. Storage buckets, object paths, public/private settings, and Storage policies are unknown. Before migration design is finalized, obtain a safe schema/policy inventory from the intended Supabase project and compare it with the live rows.

## Storage and media

- No Storage API usage or upload flow is present in `src/`.
- The current question renderer supports text and LaTeX only. It does not render images, audio, video, tables, or structured content blocks.
- No bucket names, storage paths, upload policies, MIME/size limits, or orphan cleanup logic can be verified.
- The future media contract should persist bucket plus stable object path and generate an appropriate access URL at request time; do not persist signed URLs.

## Tests and current verification inventory

- The repository declares a Node built-in test runner and has `tests/questionUtils.test.js`.
- That test file imports `../src/data/questions.js`, but no `src/data` directory or `src/data/questions.js` file is present in this checkout. This is a likely current test-suite blocker and should be confirmed by actually running the test suite in a later verification phase.
- Existing test coverage is utility-focused (normalization, math delimiter parsing/KaTeX, pagination, daily-answer consistency, and auth form validation); no API, database, authorization, integration, browser, or end-to-end tests are present.
- No lint, test, or production build was run during this audit phase.

## Security assessment

### Current risks to address before test features

1. **Direct browser database access:** published question reads and Auth operations use Supabase JS directly. This can remain for low-risk reads during transition, but RLS must be verified before relying on it.
2. **Answer-key exposure in question browsing:** both list/detail queries use `select('*')`, and normalized records expose `correct_option`, answer, and explanation to the browser. This is an existing study feature, but it must not be reused for an active examination API.
3. **No backend authority:** no server verifies JWTs or enforces student/admin roles, ownership, timing, scoring, or submission idempotency.
4. **RLS and storage policy unknown:** repository evidence cannot confirm public access boundaries. Anon-key presence does not prove safe row policies.
5. **Auth metadata is not a role system:** signup-supplied user metadata must not grant administrative privileges. Future roles must be maintained and checked in trusted backend/database data.

### Existing positive controls

- The only declared browser key is the Supabase anon key; no service-role credential appears in `.env.example` or application source inspected.
- Local environment files are ignored by Git.
- Client question access is limited in code to published rows, although database RLS remains the actual boundary.
- Question detail IDs are queried through Supabase filters, and the SPA does not contain privileged administrative actions.

## Compatibility constraints and migration strategy

- Preserve the existing Supabase Auth project, users, and redirect behavior.
- Keep the existing `questions` table as the canonical repository. No duplicate PYQ or test-specific question-content table should be introduced.
- Treat current `correct_option` as a legacy field with documented zero-based semantics pending live verification. Any future stable option IDs/content representation needs an explicit compatibility mapping and a backfill plan; do not alter its meaning in place.
- Introduce new schema additively and with migrations. Prefer nullable/defaulted columns or new related tables first, backfill in bounded batches, verify counts and representative rows, then switch reads. Preserve rollback compatibility until the new path is proven.
- Keep student app routes and auth working while adding FastAPI and a separate admin app. Migrate sensitive operations domain-by-domain; avoid a full rewrite or production cutover in one step.
- Production migrations, RLS changes, role assignment, data backfills, and deployment cutovers require an explicitly configured safe target and must never be run against production as a local convenience.

## Proposed target architecture

- **Student frontend:** retain this Vite/React application and visual system; add shared API client and migrate protected/business operations incrementally.
- **Admin frontend:** separate React/Vite app under `frontend/admin`, reusing shared contracts and design tokens without reusing student authorization assumptions.
- **Backend:** modular FastAPI monolith under `backend/app`, split into core config/auth, API v1, schemas, services, repositories, and persistence/migrations. Verify Supabase Auth JWTs and enforce trusted roles and ownership server-side. Use transaction-safe repository operations for attempts, answers, and submissions.
- **Database:** existing Supabase PostgreSQL. Preserve `questions`; add normalized examination taxonomy/configuration, PYQ paper/question mapping, test/test-section/question mapping, attempt/answer/result domains, bookmarks/collections/reports, profiles/roles, and audit records only as the implementation phase justifies them.
- **Rich content:** define one versioned validated JSON content contract for question and option blocks, retaining a legacy text/options adapter until data is migrated. Persist option IDs and stable media paths.
- **Storage:** central backend media service with role-gated upload/delete, allowlisted MIME/extension/size validation, stable bucket/object references, and policies verified against the live project.
- **Hosting:** Vercel for existing/student and admin frontends; Render for FastAPI, with explicit environment configuration and safe migration procedure. No deployment changes are included in this audit.

## Permission matrix proposal

| Role | Proposed scope |
| --- | --- |
| Student | Read published content; manage own bookmarks, private practice tests, answers, attempts, and permitted results |
| Editor | Create/edit authorized draft questions and media; no role grants from user metadata |
| Administrator | Manage tests/PYQs, review reports, publish permitted content, manage students within assigned scope |
| Super administrator | Manage roles and privileged configuration; all privileged actions audited |

All checks must be enforced in FastAPI and backed by appropriate database/RLS policies. Exact role assignment and permission granularity remain a Phase 1 decision after inspecting the existing Auth user model and policies.

## Risks and unresolved questions

- Live database schema, row counts, constraints, RLS policies, and `correct_option` values were not accessible.
- Existing storage buckets and policies were not accessible.
- Production Vercel project settings and live routes were not accessible.
- The current automated test suite may fail at import time because its daily data module is missing from the checkout.
- Direct `select('*')` exposes answer keys in public published question reads; new test sessions must use a distinct safe response projection.
- Requirements contain many future domains. Schema should be staged against working flows, not installed as an unvalidated all-at-once migration.

## Audit conclusion

Phase 0 is complete for repository-visible architecture and has produced the migration roadmap. Phase 1 must first obtain and record live schema/policy evidence, then establish backward-compatible domain contracts and migration steps. No database changes or feature refactors were made in this phase.
