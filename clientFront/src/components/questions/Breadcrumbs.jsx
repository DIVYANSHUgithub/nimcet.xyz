import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function Breadcrumbs({ items }) {
  return (
    <nav className="text-ink-muted" aria-label="Breadcrumb">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1 text-xs">
            {index > 0 && <ChevronRight size={14} className="text-ink-muted" aria-hidden="true" />}
            {item.href ? <Link to={item.href} className="text-ink-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{item.label}</Link> : <span className="font-medium text-ink-heading" aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
