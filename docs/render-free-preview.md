# Render Free API preview + Vercel frontend

The `render.yaml` Blueprint builds `backend/Dockerfile`, uses the release branch
`codex/student-mvp-deploy`, checks `/ready`, and reuses the existing Supabase project.
It creates no Render database or paid cron job. Automatic API deployments are off
so a later push does not unexpectedly replace this preview.

## First: create the API

1. Sign in to https://dashboard.render.com and choose **New → Blueprint**.
2. Connect `DIVYANSHUgithub/nimcet.xyz`. Grant repository access in your own account
   if Render asks. Select branch **codex/student-mvp-deploy**, Blueprint path
   **render.yaml**.
3. Review that the service instance is **Free** and there is no database/paid job.
4. Enter the two prompted variables:
   - `DATABASE_URL`: copy the existing dedicated runtime connection from the ignored
     local `backend/.env`. Keep its full value and `sslmode=verify-full`. The image's
     certificate override replaces the Windows certificate path. Do not post this
     credential in chat or commit it to Git.
   - `CORS_ALLOWED_ORIGINS`: your actual HTTPS frontend origin, with no trailing slash.
     Use `https://nimcet.xyz` if that will be the frontend hostname; otherwise use
     your existing Vercel hostname. Update this after Vercel assigns a new hostname.
5. Create/deploy the Blueprint. Wait until the API is Live. Copy its actual
   `https://...onrender.com` URL (do not infer it from the service name).
6. Open that URL's `/health` and `/ready`: expect `ok` and `ready`. If the deployment
   fails, inspect Render Logs. Share only the relevant error lines, with credentials
   removed. No additional database migration is required for this preview.

## Then: connect the frontend

1. In Vercel, import the same repository, selecting the release branch for this
   preview. Root directory **clientFront**, install **npm ci**, build
   **npm run build:deploy**, output **dist**, Node **22.x**.
2. Set the public variables from `clientFront/.env.production.example`. In particular:
   `VITE_API_BASE_URL=https://<actual-Render-host>/api/v1`, question mode `backend`,
   and PYQ/detailed analytics flags `false`. Use only the Supabase public/anon key.
3. Deploy. Add the actual frontend origin to Render's `CORS_ALLOWED_ORIGINS`, then
   redeploy the API so the change takes effect.
4. Set Supabase Auth Site URL and redirects for this frontend. Test confirmation
   and reset emails to ordinary students; configure SMTP for student onboarding.
5. Run the read-only smoke check and student acceptance checklist in
   `student-mvp-deployment-runbook.md`, including homepage **View answer** navigation.

## Free preview limitations

Render Free web services sleep after 15 minutes without inbound traffic and can
take about a minute to wake. Before testing, visit `/ready` and wait for it to be
ready, then open the student site. The application request timeout is shorter than
the documented cold start. Use this preview to validate deployment; select an
always-running service before relying on it for scheduled student tests.

No paid scheduler is created by this Blueprint. Browser-close expiry/scheduler
acceptance is still pending until a scheduled finalizer is configured. Existing
request-time expiry handling remains in place. Do not claim the preview completes
the unattended scheduler check.

References: https://render.com/docs/blueprint-spec and https://render.com/docs/free
