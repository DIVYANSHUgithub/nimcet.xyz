# NIMCET.XYZ

React 19, Vite 8, React Router 7, Tailwind CSS 4, KaTeX, and Supabase.

## Local setup

1. Install Node.js and npm.
2. Copy `.env.example` to `.env.local` and set the Supabase project URL and public anon key.
3. Run `npm install`, then `npm run dev`.

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are browser-visible configuration values. Never put a Supabase service-role key in a `VITE_*` variable or commit it to this repository.

## Supabase setup

The app reads published rows from the `questions` table. The inspected project schema includes `id`, `exam`, `exam_year`, `section`, `question_number`, `question`, `options`, `correct_option`, `explanation`, `subject`, `topic`, `difficulty`, `source`, `status`, and `created_at`. The app treats `correct_option` as a zero-based option index. It paginates and filters on the server, and details are loaded by published row ID.

The inspected table does not include a chapter, question type, popularity/importance classification, or attempt-count field. Chapter filtering is marked unavailable, difficulty stays unspecified when null, and the UI does not invent those statistics. No database migration or RLS policy files were present in this checkout, so database ownership policies could not be verified here. Keep question access read-only for the public client unless the project’s policies explicitly authorize more.

Email/password signup and login use Supabase Auth. Configure the local app origin as a Supabase Site URL/redirect allowlist, including the `/login` confirmation redirect and `/reset-password` recovery route. Username is currently saved as Auth user metadata; there is no public profile table or username uniqueness constraint in this repository.

Google OAuth and GitHub OAuth remain unavailable in the UI because the provider settings and redirect configuration for the connected Supabase project have not been verified. Enable a provider in Supabase and verify its callback URLs before making it available. The frontend uses only the anon key; do not expose administrative credentials.

## Styling and checks

Tailwind v4 is configured through the Vite plugin and the CSS-first theme in `src/index.css`. That file is the Tailwind entry point and imports KaTeX’s required vendor stylesheet; app layout and component styling use Tailwind utilities.

Available commands:

- `npm run dev` — start the local development server.
- `npm run lint` — run ESLint.
- `npm test` — run the Node test suite for question normalization, math parsing/KaTeX support, daily answer consistency, and pagination boundaries.
- `npm run build` — create the production build.

The first local daily-question item is excluded until its corrupted summation and mismatched probability explanation can be checked against an authoritative source.
