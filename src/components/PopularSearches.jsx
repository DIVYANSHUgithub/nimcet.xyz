export default function PopularSearches({ items, onSelect, activeItem }) {
  return (
    <div className="popular-searches">
      <span className="popular-searches__label">Popular searches:</span>
      <div className="popular-searches__pills">
        {items.map((term) => (
          <button
            key={term}
            type="button"
            className={`pill ${activeItem === term ? 'pill--active' : ''}`}
            onClick={() => onSelect?.(term)}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}
