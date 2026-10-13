import { Link } from 'react-router-dom'
import { BookOpen, Brain, Calculator, ChevronRight } from 'lucide-react'

const iconMap = { mathematics: Calculator, reasoning: Brain }

export default function SubjectCard({ subject }) {
  const Icon = iconMap[subject.id] || BookOpen
  return (
    <Link
      to={`/questions?subject=${subject.id}`}
      className="flex min-h-24 items-center gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas-muted text-ink-heading">
        <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-ink-heading">{subject.name}</span>
      <ChevronRight size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
    </Link>
  )
}
