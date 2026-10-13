import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildPageNumbers } from '../../utils/filterQuestions'

export default function Pagination({
  page,
  totalPages,
  start,
  end,
  totalLabel,
  onPageChange,
}) {
  const pages = buildPageNumbers(page, totalPages)

  return (
    <div className="qb-pagination">
      <div className="qb-pagination__controls">
        <button
          type="button"
          className="qb-pagination__btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="qb-pagination__ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`qb-pagination__page ${page === p ? 'qb-pagination__page--active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={page === p ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          className="qb-pagination__btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <p className="qb-pagination__summary">
        Showing {start}–{end} of {totalLabel} questions
      </p>
    </div>
  )
}
