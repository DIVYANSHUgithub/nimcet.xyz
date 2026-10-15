import { Filter } from 'lucide-react'

const controlClass = 'min-h-10 w-full min-w-0 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink-heading outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

function FilterField({ label, children, className = '' }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  )
}

export default function QuestionFilters({
  subjects = [],
  subject,
  onSubjectChange,
  topic,
  onTopicChange,
  difficulty,
  onDifficultyChange,
  questionType,
  onQuestionTypeChange,
  year,
  onYearChange,
  sort,
  onSortChange,
  onClear,
}) {
  return (
    <section className="mb-5 rounded-lg border border-line bg-canvas-muted p-3.5" aria-label="Question filters">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-heading">
        <Filter size={16} aria-hidden="true" /> Filters
      </h2>
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        <FilterField label="Subject">
          <select className={controlClass} value={subject} onChange={(event) => onSubjectChange(event.target.value)}>
            <option value="all">All subjects</option>
            {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Topic">
          <input className={controlClass} value={topic} onChange={(event) => onTopicChange(event.target.value)} placeholder="Any topic" />
        </FilterField>
        <FilterField label="Chapter">
          <span className="flex min-h-10 w-full items-center rounded-md border border-line bg-canvas-muted px-3 text-sm text-ink-muted" title="The published questions table does not have a chapter field." aria-label="Chapter filtering is not available">Not available</span>
        </FilterField>
        <FilterField label="Difficulty">
          <select className={controlClass} value={difficulty} onChange={(event) => onDifficultyChange(event.target.value)}>
            <option value="">Any difficulty</option>
            <option value="unspecified">Unspecified</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </FilterField>
        <FilterField label="Type">
          <select className={controlClass} value={questionType} onChange={(event) => onQuestionTypeChange(event.target.value)}>
            <option value="">All types</option>
            <option value="MCQ">MCQ</option>
          </select>
        </FilterField>
        <FilterField label="Exam year">
          <input className={controlClass} type="number" min="1900" max="2100" inputMode="numeric" value={year} onChange={(event) => onYearChange(event.target.value)} placeholder="Any year" />
        </FilterField>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onClear} className="min-h-9 rounded-md px-2 text-xs font-medium text-ink-muted underline underline-offset-2 hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Clear filters</button>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          Sort
          <select className={`${controlClass} min-h-9`} value={sort} onChange={(event) => onSortChange(event.target.value)}>
            <option value="newest">Newest</option>
            <option value="question-number">Question number</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-ink-muted">
        Chapter is not stored and difficulty is unspecified in the published question data.
      </p>
    </section>
  )
}
