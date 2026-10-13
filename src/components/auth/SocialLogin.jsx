export default function SocialLogin() {
  return (
    <div className="mt-6 border-t border-line pt-4" aria-label="Social sign in">
      <p className="mb-3 text-center text-xs leading-5 text-ink-muted">Google and GitHub sign in are unavailable until their providers are verified in Supabase.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-md border border-line bg-canvas-muted px-3 text-sm font-medium text-ink-muted opacity-75" title="Google OAuth provider configuration has not been verified">Google (not configured)</button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-md border border-line bg-canvas-muted px-3 text-sm font-medium text-ink-muted opacity-75" title="GitHub sign in is not configured">GitHub (unavailable)</button>
      </div>
    </div>
  )
}
