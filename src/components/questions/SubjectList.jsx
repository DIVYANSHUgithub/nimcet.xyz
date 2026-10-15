import { BookOpen, Brain, Calculator, ChevronRight } from 'lucide-react'

const iconMap = { mathematics: Calculator, reasoning: Brain }

export default function SubjectList({ subjects = [], selectedId, onSelect }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-labelledby="question-subjects-title">
      <h2 id="question-subjects-title" className="mb-3 text-sm font-semibold text-ink-heading">Subjects</h2>
      <ul className="space-y-1">
        {subjects.map((subject) => {
          const slug = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          const Icon = iconMap[slug.includes('mathematics') ? 'mathematics' : slug.includes('reasoning') ? 'reasoning' : ''] || BookOpen
          const active = selectedId === subject.id
          return (
            <li key={subject.id}>
              <button type="button" className={`flex min-h-11 w-full items-center gap-2.5 rounded-md border-l-[3px] px-2.5 py-2 text-left transition-colors hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active ? 'border-brand bg-canvas-subtle' : 'border-transparent'}`} onClick={() => onSelect?.(subject.id)} aria-pressed={active}>
                <Icon size={18} className="shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm font-medium text-ink-heading">{subject.name}</span>
                <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
