import { Link } from 'react-router-dom'
import { BookOpenCheck, SearchCheck } from 'lucide-react'

export default function PracticeCard() {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-1 text-sm font-semibold text-ink-heading">Practice with published questions</h2>
      <p className="mb-4 text-xs leading-relaxed text-ink-muted">
        Browse questions, review answer keys, and read the explanations currently available.
      </p>
      <ul className="mb-4 space-y-2 text-xs text-ink">
        <li className="flex items-center gap-2"><SearchCheck size={15} className="text-ink-muted" /> Filter questions by topic and exam year</li>
        <li className="flex items-center gap-2"><BookOpenCheck size={15} className="text-ink-muted" /> Open full question details</li>
      </ul>
      <Link
        to="/questions"
        className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Browse questions
      </Link>
    </section>
  )
}
