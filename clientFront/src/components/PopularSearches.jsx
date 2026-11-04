import { cn } from '../lib/cn'

export default function PopularSearches({ items, onSelect, activeItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="shrink-0 text-[0.8125rem] text-ink-muted">Try a search:</span>
      <div className="flex flex-wrap gap-2">
        {items.map((term) => (
          <button
            key={term}
            type="button"
            className={cn(
              'inline-flex items-center rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              activeItem === term
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-canvas-subtle text-ink hover:border-line-strong hover:bg-canvas-muted'
            )}
            onClick={() => onSelect?.(term)}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}
