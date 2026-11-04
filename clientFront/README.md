# NIMCET.XYZ

React 19, Vite 8, React Router 7, Tailwind CSS 4, KaTeX, and Supabase.

## Local setup

1. Install Node.js and npm.
2. Copy `.env.example` to `.env.local` and set the Supabase project URL and public anon key.
3. Run `npm install`, then `npm run dev`.

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are browser-visible configuration values. Never put a Supabase service-role key in a `VITE_*` variable or commit it to this repository.

Question reads continue using Supabase by default. To exercise the FastAPI adapter after the backend and its read-only database role are configured, set `VITE_API_BASE_URL` to the backend `/api/v1` URL and `VITE_QUESTION_API_MODE=backend`. The adapter forwards the current Supabase access token when a user has a session and supports anonymous reads. Do not enable the backend mode in a deployment until its database privileges, CORS origin, and published question responses have been verified in a non-production environment.

## Supabase setup

The app reads published rows from the `questions` table. The inspected project schema includes `id`, `exam`, `exam_year`, `section`, `question_number`, `question`, `options`, `correct_option`, `explanation`, `subject`, `topic`, `difficulty`, `source`, `status`, and `created_at`. The app treats `correct_option` as a zero-based option index. It paginates and filters on the server, and details are loaded by published row ID.

Question media is optional. Use `question_image_url` for an image belonging to the question prompt. Each `options` item can remain a plain text string, or be an object such as `{"text":"", "image_url":"https://..." }` for an image choice. The frontend also recognizes a legacy image URL stored directly in the options array and renders it as an image. Prefer stable public object URLs for public question content; signed URLs expire and must be regenerated when using a private bucket.

The inspected table does not include a chapter, question type, popularity/importance classification, or attempt-count field. Chapter filtering is marked unavailable, difficulty stays unspecified when null, and the UI does not invent those statistics. A local catalog migration draft exists but has not been applied to production; full migration history and production role/default-privilege verification remain pending. Keep question access read-only for the public client unless the project's policies explicitly authorize more.

Email/password signup and login use Supabase Auth. Configure the local app origin as a Supabase Site URL/redirect allowlist, including the `/login` confirmation redirect and `/reset-password` recovery route. Username is currently saved as Auth user metadata; there is no public profile table or username uniqueness constraint in this repository.

Google and GitHub buttons on both the login and signup pages start Supabase OAuth and return signed-in users to `/questions`. OAuth-created accounts use the same Supabase Auth user records as email signup; the username field is only collected by email signup.

To enable a provider, open **Authentication → Providers** in the Supabase dashboard and add that provider's OAuth client ID and client secret. In Google Cloud or GitHub, register this as the provider callback URL:

`https://fchvtcnhabmnlfxsrzvu.supabase.co/auth/v1/callback`

In **Authentication → URL Configuration**, set the production Site URL and add the production redirect URL `https://nimcet.xyz/questions`. For local development, also allow the local URL such as `http://localhost:5173/questions` (use the Vite URL shown by `npm run dev`). Provider setup and redirect allowlisting are required before the buttons can complete sign-in. The frontend uses only the Supabase anon key; never expose a service-role key or put OAuth client secrets in this app.

## Styling and checks

Tailwind v4 is configured through the Vite plugin and the CSS-first theme in `src/index.css`. That file is the Tailwind entry point and imports KaTeX’s required vendor stylesheet; app layout and component styling use Tailwind utilities.

Available commands:

- `npm run dev` — start the local development server.
- `npm run admin:dev` — start the separate admin app.
- `npm run lint` — run ESLint.
- `npm test` — run the repository Node test suite for backend API calls, question normalization, media/math rendering, admin access, and pagination.
- `npm run build` — create the production build.
- `npm run admin:build` — build the separate admin app.

The first local daily-question item is excluded until its corrupted summation and mismatched probability explanation can be checked against an authoritative source.

