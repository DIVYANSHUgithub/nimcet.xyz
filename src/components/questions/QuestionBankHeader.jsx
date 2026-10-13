import { Search } from 'lucide-react'

export default function QuestionBankHeader({ search, onSearchChange }) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-heading sm:text-3xl">Question Bank</h1>
        <p className="mt-1 max-w-lg text-sm leading-6 text-ink-muted">Explore published NIMCET questions with detailed solutions.</p>
      </div>
      <div className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 sm:max-w-sm">
        <Search size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
        <label htmlFor="qb-search" className="sr-only">Search questions, topics, or keywords</label>
        <input id="qb-search" type="search" className="min-w-0 flex-1 bg-transparent text-sm text-ink-heading outline-none placeholder:text-ink-muted" placeholder="Search questions or topics" value={search} onChange={(event) => onSearchChange(event.target.value)} />
      </div>
    </header>
  )
}
