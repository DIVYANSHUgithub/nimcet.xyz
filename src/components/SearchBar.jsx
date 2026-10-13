import { useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import { searchableItems } from '../data/topics'

export default function SearchBar({ onSearch, placeholder }) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filtered =
    query.trim().length > 0
      ? searchableItems.filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase())
        )
      : []

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch?.(query)
    setShowSuggestions(false)
  }

  return (
    <div className="search-bar">
      <form className="search-bar__form" onSubmit={handleSubmit}>
        <label htmlFor="main-search" className="visually-hidden">
          Search questions, topics, or subjects
        </label>
        <Search size={20} className="search-bar__icon" aria-hidden="true" />
        <input
          id="main-search"
          type="search"
          className="search-bar__input"
          placeholder={placeholder || 'Search questions, topics, or subjects...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          autoComplete="off"
        />
        <button type="submit" className="search-bar__submit" aria-label="Search">
          <ArrowRight size={18} />
        </button>
      </form>

      {showSuggestions && filtered.length > 0 && (
        <ul className="search-bar__suggestions" role="listbox">
          {filtered.slice(0, 6).map((item) => (
            <li key={`${item.type}-${item.label}`}>
              <button
                type="button"
                className="search-bar__suggestion"
                onMouseDown={() => {
                  setQuery(item.label)
                  onSearch?.(item.label)
                  setShowSuggestions(false)
                }}
              >
                <span className="search-bar__suggestion-type">{item.type}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
