# Supabase Live Schema Audit

**Project reference supplied by owner:** `fchvtcnhabmnlfxsrzvu`  
**Audit date:** 1 November 2026  
**Scope:** read-only REST/API checks and local CLI/configuration inspection. Full database catalog inspection was not possible because no Supabase CLI Management API authentication or remote database password was available.

## Executive summary

The existing frontend's Supabase URL and public anon key can read the public `questions` relation. The public REST endpoint returned 102 rows, all published, with unique integer IDs, four options per question, and `correct_option` values that fit zero-based array indexing. Auth's public settings endpoint reports email signup enabled, email confirmation required, and email, Google, and GitHub providers enabled. One legacy question stores a signed Storage URL for the existing `questionImage` bucket; its signed URL returned HTTP 200 at audit time. The URL/token are not reproduced here.

The Supabase CLI is available through `npx` at version `2.122.0`; no global CLI executable was found. A local `supabase/` directory and `config.toml` were initialized. The CLI is not authenticated or linked to the hosted project. The unauthenticated CLI project-list request failed; there is no `.temp/project-ref`. Full Postgres catalogs, migration history, policies, grants, triggers, functions, bucket metadata, and object listings therefore remain unverified. No production changes were made.

## Evidence and limits

| Check | Result | Confidence / limitation |
| --- | --- | --- |
| Existing app project URL | Connects to `fchvtcnhabmnlfxsrzvu.supabase.co` | Matches owner-supplied project reference; URL itself is not repeated from the local env file. |
| Public PostgREST `questions` read | HTTP 200; `Content-Range: 0-101/102` | 102 rows visible to the anon key. This does not prove there are no rows hidden by RLS. |
| PostgREST OpenAPI schema | HTTP 401 | Could not use it for relation definitions. |
| Auth public settings | HTTP 200 | Exposes selected public Auth settings only, not dashboard redirect allow-lists, signing keys, or provider secrets. |
| Storage bucket list | HTTP 200, but `questionImage` was not listed to anon | Cannot infer bucket visibility from an anon list response. Direct bucket metadata lookup returned HTTP 400; admin metadata unavailable. |
| Supabase CLI | `npx supabase --version` → `2.122.0` | No global `supabase` command found. |
| CLI authentication | `supabase projects list` failed as unauthenticated | No project Management API access token was present in the process environment. Token values were not searched or printed. |
| CLI remote link | Not linked | No `supabase/.temp/project-ref`; linking requires CLI auth and remote DB password. |
| Remote database connection | Not established | No password/connection string was available. No remote SQL, dump, migration-list, or catalog query ran. |

## Publicly observable `public.questions` shape

The API response exposed these keys (this is **not** SQL DDL):

`id`, `exam`, `exam_year`, `section`, `question_number`, `question`, `options`, `correct_option`, `explanation`, `subject`, `topic`, `difficulty`, `source`, `status`, `created_at`.

| Property | Observed result |
| --- | --- |
| Anon-visible rows | 102; exact PostgREST count 102 |
| IDs | 102 non-null, unique integer-shaped IDs; range 3–106. SHA-256 of comma-joined IDs sorted ascending: `c2832486a00b0ba0f3cbfff594171f31954f0a7e859388b4efa7e4e0c462888d` |
| Publication status | 102 `published` rows visible |
| Exam/year | `NIMCET`; year `2026` |
| Subjects | `Analytical Ability & Logical Reasoning`, `Computer Awareness`, `General English`, `Mathematics` |
| Sections | Same four labels as the observed subjects |
| Difficulty | `Easy`, `Medium` |
| Source labels | `NIMCET 2026`, `NIMCET Answer Key PDF` |
| Question number | Values range 1–50 across 102 rows |
| Prompt/explanation | No blank question or explanation values in the returned rows |
| Options | REST JSON shape was an array for all 102 rows; every row had four options |
| `correct_option` | Numeric values: 0=24, 1=30, 2=24, 3=24. All 102 fit the zero-based array range; none fit the one-based-only out-of-range pattern. This confirms compatibility with the application's zero-based interpretation, not correctness against an official answer key. |
| SQL types / primary key | Not observable through this REST response. JSON showed integer-shaped IDs/year/question numbers and timestamp-shaped `created_at`; SQL type, PK, nullability, defaults, and constraints remain unknown. |

The 102 rows are those visible to the configured anon client. Do not treat this as the full physical table count until RLS and grants are inspected. The ID fingerprint is a baseline aid; it does not capture question text or answer values.

## Existing media references

One explicit URL was found in question ID `69`. Its URL path identifies `questionImage/Screenshot 2026-11-01 010954.png` and contains a `token` query parameter, so it is a signed URL rather than a stable object reference. A `HEAD` request returned HTTP 200 on the audit date. The signed URL and token are deliberately withheld. This is strong evidence that at least this legacy row persists an expiring Storage URL. Do not rewrite the question or delete/move the object as part of this audit.

The owner identifies an existing bucket named `questionImage`. Its public/private setting, file-size and MIME restrictions, object inventory, and policies were not visible to anon. Do not change its visibility or its objects. The one observed path should be checked against the bucket inventory after authenticated access is configured.

## Authentication configuration observed

`GET /auth/v1/settings` reported:

- Email signup enabled.
- Email confirmation required.
- Enabled public provider names: `email`, `google`, `github`.

The frontend uses Supabase Auth directly for email/password signup/login, password reset, and Google/GitHub OAuth. Its code sends redirects to `/login`, `/reset-password`, and `/questions` on the current origin. The production allow-list, email templates, password policy, JWT signing algorithm/key, exact issuer, and user/profile/role records were not obtainable from the public settings endpoint.

## Existing local Supabase setup

- `supabase/config.toml` was generated by `npx supabase init` with local project label `nimcet.xyz`; that value is not a remote link.
- Local redirects now match Vite's `localhost:5173` routes used by the app, and local email confirmations are enabled to mirror the observed hosted setting.
- CLI-generated local `db.major_version = 17` and Storage `file_size_limit = 50MiB` are defaults only; remote Postgres version and bucket limits are unverified. The config comments state this explicitly.
- Local OAuth credentials are not configured. The hosted project's provider settings were not changed.
- `supabase/.gitignore` excludes `.temp`, `.branches`, and local dotenv files. The root `.gitignore` now also excludes dotenv variants while preserving `.env.example` templates.
- No `supabase/migrations/` baseline was created because there is no authenticated remote dump/history and no verified local schema snapshot to baseline.

## Proposed schema comparison

| Proposed item | Classification | Production comparison and compatibility notes |
| --- | --- | --- |
| Central `questions` table | **Already exists** (REST evidence) | Retain it and all existing IDs/records. Its database constraints and full hidden-row count remain unknown. |
| Existing `questionImage` bucket | **Already exists** (owner-provided) | Preserve bucket and objects. Visibility, policies, and limits require authenticated inspection. |
| Supabase Auth identities | **Already exists** (app and public settings evidence) | Preserve all accounts and current providers. User records/identity linkage were not inspected. |
| Examination/subject/chapter/topic catalog | **Requires new table(s)** | Current rows have text labels; reconcile labels and legacy taxonomy before mapping. |
| Question revision/rich-content records with stable option IDs | **Requires new table(s)** | Prefer a revision table referencing the existing question ID; avoid adding mandatory columns to `questions`. Legacy `options` arrays can be backfilled without changing the old row. |
| Legacy option/correct-answer normalization | **Requires data transformation** | Translate four option strings and the observed zero-based answer index to stable option IDs. Validate each row and preserve originals. |
| Media asset registry and associations | **Requires new table(s)** | Store bucket/object path, not signed URLs. Convert the row 69 URL only after authenticated object verification. |
| Role/profile assignments | **Requires new table(s)** | No role table is evidenced in this checkout. Do not promote existing users. |
| Test versions, sections, mappings, PYQ metadata | **Requires new table(s)** | All proposed; questions remain referenced from central question/revision identity. |
| Attempts, saved answers, submissions, results | **Requires new table(s)** | All proposed; ownership and immutable test-version references required. |
| Bookmarks, collections, question reports, preferences, audit events | **Requires new table(s)** | All proposed; student data must be owner-scoped. |
| Constraints | **Requires a constraint** | New tables need PK/FK/unique/check constraints. Existing `questions` constraints cannot be assessed until catalog inspection. |
| Indexes | **Requires an index** | Index new FKs and owner/status/time access paths. Existing indexes and query plans are unknown; inspect before adding duplicates. |
| RLS | **Requires an RLS policy** | Effective anon reads are observed; whether RLS is enabled and which policies/grants cause access is unknown. Add policies only after current policy export and role model review. |
| Existing questionImage policy/visibility changes | **Requires manual configuration** | No change made. Owner/dashboard review is required; no visibility change without approval. |
| Auth redirect/provider/dashboard configuration | **Requires manual configuration** | Public settings show providers/confirmation but do not expose URL allow-list or credential settings. |
| JWT algorithm/issuer/audience and backend DB role | **Requires manual configuration** | Determine from Auth/API settings and secure backend connection setup; no key or password was read. |

### Existing entities to retain

- All 102 anon-visible `questions` rows and their IDs (plus any rows hidden from anon).
- Existing Supabase Auth users and enabled email/Google/GitHub methods.
- Existing `questionImage` bucket and every existing object.

### Likely compatibility problems

1. New FKs must use the actual existing `questions.id` SQL type (REST suggests integer-shaped IDs, not UUIDs).
2. New option IDs must map back to the legacy four-element array positions; do not reinterpret `correct_option`.
3. One question stores a signed URL. A stable object path must replace it only in a new rich-content revision after the object is verified.
4. Public published-question reads currently include answer keys/explanations because the app selects `*`. Preserve this study behavior only for practice endpoints; active test-session APIs must omit keys.
5. Same subject and section labels appear in current data, but these concepts may have different meanings in future examination configuration.

## Index recommendations

- Preserve and inspect the current PK/indexes first. Current 102-row public dataset does not justify speculative full-text/trigram indexing.
- For the current question query patterns, evaluate composite indexes beginning with `status` and common exact filters such as `(status, subject, exam_year)` only after remote `EXPLAIN` and actual selectivity are known.
- Add indexes for every new FK and for `(owner_id, created_at DESC)`, `(status, created_at)`, and attempt lookup by `(user_id, started_at DESC)` where those access paths are implemented.
- Ensure unique constraints on question revision numbers, test version numbers, attempt question order, active role grants, and `(user_id, question_id)` bookmarks.
- Use `EXPLAIN (ANALYZE, BUFFERS)` only on a safe environment or carefully selected read-only queries; do not run expensive profiling on production without a planned load window.

## Read-only SQL needed to close the audit

Run through an authenticated SQL connection after the owner securely completes CLI login/linking. These queries are for inspection; do not include credentials in SQL or commit result dumps containing personal data.

```sql
-- Columns, nullability, defaults, and SQL types
select table_schema, table_name, ordinal_position, column_name, data_type,
       udt_name, is_nullable, column_default
from information_schema.columns
where table_schema not in ('information_schema', 'pg_catalog')
order by table_schema, table_name, ordinal_position;

-- Constraints
select ns.nspname as schema_name, tbl.relname as table_name,
       con.conname, con.contype, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class tbl on tbl.oid = con.conrelid
join pg_namespace ns on ns.oid = tbl.relnamespace
where ns.nspname not in ('pg_catalog', 'information_schema')
order by 1, 2, 3;

-- Indexes
select schemaname, tablename, indexname, indexdef
from pg_indexes where schemaname not in ('pg_catalog', 'information_schema')
order by schemaname, tablename, indexname;

-- RLS state and policies
select ns.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity,
       p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check
from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
left join pg_policies p on p.schemaname = ns.nspname and p.tablename = c.relname
where ns.nspname not in ('pg_catalog', 'information_schema')
  and c.relkind in ('r', 'p', 'v', 'm')
order by 1, 2, 5;

-- Triggers, functions, views, extensions, and grants should also be inventoried.
select extname, extversion from pg_extension order by extname;
select schemaname, viewname, definition from pg_views
where schemaname not in ('pg_catalog', 'information_schema');
select grantee, table_schema, table_name, privilege_type
from information_schema.table_privileges
where table_schema not in ('pg_catalog', 'information_schema')
order by 2, 3, 1, 4;
```

For the existing answer mapping, compare IDs, option lengths, nulls, and answer index range without exporting prompt text:

```sql
select count(*) as row_count,
       count(distinct id) as distinct_ids,
       min(id) as min_id,
       max(id) as max_id,
       count(*) filter (where status = 'published') as published_count,
       count(*) filter (where jsonb_typeof(options::jsonb) = 'array') as option_arrays,
       count(*) filter (where jsonb_array_length(options::jsonb) = 4) as four_option_rows,
       count(*) filter (where correct_option < 0
                         or correct_option >= jsonb_array_length(options::jsonb)) as out_of_range_answers
from public.questions;
```

The last query assumes `options` can be cast to JSON and `correct_option` is numeric. Validate column types first and adjust it read-only if the actual SQL type differs.

## Migration sequence

See [supabase-migration-plan.md](supabase-migration-plan.md). The required first step is secure CLI authentication and a full schema/policy/Storage baseline. No migrations were authored or applied in this phase.
