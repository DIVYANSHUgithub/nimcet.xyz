import { LoaderCircle } from 'lucide-react'

export default function PageLoading({ message = 'Loading page…' }) {
  return (
    <div className="grid min-h-svh place-items-center bg-canvas px-5">
      <div role="status" className="flex items-center gap-3 rounded-xl border border-line bg-surface px-5 py-4 text-sm font-semibold text-ink-heading shadow-card">
        <LoaderCircle size={20} className="shrink-0 text-accent motion-safe:animate-spin" aria-hidden="true" />
        {message}
      </div>
    </div>
  )
}
