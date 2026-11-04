import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildPageNumbers } from '../../utils/filterQuestions'

export default function Pagination({ page, totalPages, start, end, totalLabel, onPageChange }) {
  const pages = buildPageNumbers(page, totalPages)
  const navButton = 'inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-line bg-surface px-2 text-sm text-ink-heading transition hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="mt-6 flex flex-col items-center gap-3 border-t border-line pt-4 md:flex-row md:justify-between">
      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Question pages">
        <button type="button" className={navButton} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} aria-hidden="true" /></button>
        {pages.map((number, index) => number === '…' ? <span key={`ellipsis-${index}`} className="px-1 text-sm text-ink-muted" aria-hidden="true">…</span> : (
          <button key={number} type="button" className={`inline-flex size-9 items-center justify-center rounded-md border text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${page === number ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:bg-canvas-muted'}`} onClick={() => onPageChange(number)} aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined}>{number}</button>
        ))}
        <button type="button" className={navButton} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page"><ChevronRight size={16} aria-hidden="true" /></button>
      </nav>
      <p className="m-0 text-xs text-ink-muted" aria-live="polite">Showing {start}–{end} of {totalLabel} questions</p>
    </div>
  )
}
