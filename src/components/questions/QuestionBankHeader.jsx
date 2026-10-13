import { Search } from 'lucide-react'

export default function QuestionBankHeader({ search, onSearchChange }) {
  return (
    <div className="qb-header">
      <div className="qb-header__text">
        <h1 className="qb-header__title">Question Bank</h1>
        <p className="qb-header__subtitle">
          Explore topic-wise questions with detailed solutions.
        </p>
      </div>
      <div className="qb-header__search">
        <label htmlFor="qb-search" className="visually-hidden">
          Search questions, topics, or keywords
        </label>
        <Search size={18} className="qb-header__search-icon" aria-hidden="true" />
        <input
          id="qb-search"
          type="search"
          className="qb-header__search-input"
          placeholder="Search questions, topics, or keywords..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  )
}
