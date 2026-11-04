import { useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'

export default function SearchBar({ onSearch, placeholder, searchableItems = [] }) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const filtered = query.trim()
    ? searchableItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : []
  const activeItem = filtered[activeIndex]

  const submit = (value = query) => {
    onSearch?.(value.trim())
    setShowSuggestions(false)
    setActiveIndex(-1)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    submit()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' && filtered.length) {
      event.preventDefault()
      setShowSuggestions(true)
      setActiveIndex((current) => Math.min(current + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp' && filtered.length) {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && activeItem) {
      event.preventDefault()
      setQuery(activeItem.label)
      submit(activeItem.label)
    } else if (event.key === 'Escape') {
      setShowSuggestions(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="relative mb-5">
      <form className="flex items-center rounded-lg border border-line-strong bg-surface py-1 pl-4 pr-1 transition-[border-color,box-shadow] focus-within:border-ink-heading focus-within:shadow-card" onSubmit={handleSubmit}>
        <label htmlFor="main-search" className="sr-only">Search questions, topics, or subjects</label>
        <Search size={20} className="shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          id="main-search"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={showSuggestions && filtered.length > 0}
          aria-controls="main-search-listbox"
          aria-activedescendant={activeItem ? `main-search-option-${activeIndex}` : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[0.9375rem] text-ink-heading outline-none placeholder:text-ink-muted"
          placeholder={placeholder || 'Search questions, topics, or subjects...'}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(-1)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label="Search">
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>

      {showSuggestions && filtered.length > 0 && (
        <ul id="main-search-listbox" className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 m-0 list-none rounded-md border border-line bg-surface p-1.5 shadow-raised" role="listbox" aria-label="Search suggestions">
          {filtered.map((item, index) => (
            <li key={`${item.type}-${item.label}`} role="presentation">
              <button id={`main-search-option-${index}`} type="button" role="option" aria-selected={activeIndex === index} tabIndex={-1} className={`flex min-h-10 w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm text-ink-heading hover:bg-canvas-muted ${activeIndex === index ? 'bg-canvas-muted' : ''}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(item.label); submit(item.label) }}>
                <span className="rounded-sm bg-canvas-subtle px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-ink-muted uppercase">{item.type}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
