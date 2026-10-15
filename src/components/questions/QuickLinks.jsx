import { Clock3, FileQuestion, Shuffle, Star, TrendingUp } from 'lucide-react'

const quickLinks = [
  { id: 'pyqs', label: 'Previous Year Questions', icon: 'file' },
  { id: 'important', label: 'Important Questions', icon: 'star' },
  { id: 'random', label: 'Random Question', icon: 'shuffle' },
  { id: 'recent', label: 'Recently Added', icon: 'clock' },
  { id: 'attempted', label: 'Most Attempted', icon: 'trending' },
]

const iconMap = {
  file: FileQuestion,
  star: Star,
  shuffle: Shuffle,
  clock: Clock3,
  trending: TrendingUp,
}

export default function QuickLinks({ onAction }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink-heading">Quick links</h2>
      <ul className="space-y-1">
        {quickLinks.map((link) => {
          const Icon = iconMap[link.icon]
          return (
            <li key={link.id}>
              <button
                type="button"
                className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-ink transition-colors hover:bg-canvas-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                onClick={() => onAction?.(link.id)}
              >
                <Icon size={16} className="shrink-0 text-ink-muted" aria-hidden="true" />
                <span>{link.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
