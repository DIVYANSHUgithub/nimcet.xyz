import { useId, useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import Button from '../ui/Button'

const controlClass = 'min-h-10 w-full min-w-0 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink-heading outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

function FilterField({ label, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-sm font-medium text-ink-heading">{label}</span>
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
  activeFilterCount,
}) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const filterLabel = activeFilterCount ? `Filters (${activeFilterCount} active)` : 'Filters'

  return (
    <section className="mb-5 rounded-xl border border-line bg-canvas-muted p-4 sm:p-5" aria-label="Question filters">
      <h2 className="hidden items-center gap-2 text-sm font-semibold text-ink-heading lg:flex">
        <Filter size={16} aria-hidden="true" /> {filterLabel}
      </h2>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-10 w-full items-center gap-2 rounded-md text-left text-sm font-semibold text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:hidden"
      >
        <Filter size={16} aria-hidden="true" /> {filterLabel}
        <ChevronDown size={16} className={`ml-auto ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id={panelId} className={`mt-3 ${expanded ? 'block' : 'hidden'} lg:block`}>
        <div className="grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          <FilterField label="Subject">
            <select className={controlClass} value={subject} onChange={(event) => onSubjectChange(event.target.value)}>
              <option value="">All subjects</option>
              {subject && !subjects.some((item) => item.id === subject) && <option value={subject}>{subject}</option>}
              {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </FilterField>
          <FilterField label="Topic">
            <input className={controlClass} value={topic} onChange={(event) => onTopicChange(event.target.value)} placeholder="Any topic" />
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
          <FilterField label="Sort">
            <select className={controlClass} value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="question-number">Question number</option>
              <option value="newest">Newest</option>
            </select>
          </FilterField>
        </div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={onClear}>Clear filters</Button>
      </div>
    </section>
  )
}
