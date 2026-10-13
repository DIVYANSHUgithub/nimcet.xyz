import { ChevronDown, ChevronUp } from 'lucide-react'
import Badge from './ui/Badge'
import { difficultyTone } from '../utils/difficultyTone'
import MathText from './MathText'

export default function DailyQuestionCard({ question, index, total, isExpanded, onToggle }) {
  const { id, difficulty, question: prompt, options = [], answer, explanation } = question
  const answerId = `daily-answer-${id}`

  return (
    <article className={`overflow-hidden rounded-xl border border-line bg-surface ${isExpanded ? 'shadow-card' : ''}`}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Question {index + 1} of {total}</span>
            <Badge tone={difficultyTone(difficulty)}>{difficulty || 'Difficulty not provided'}</Badge>
          </div>
          <div className="mb-3 break-words text-sm font-medium leading-6 text-ink-heading"><MathText text={prompt} /></div>
          <ol className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2" aria-label="Answer options">
            {options.map((option, optionIndex) => <li key={`${id}-option-${optionIndex}`} className="min-w-0 rounded-md border border-line bg-canvas-muted/50 px-3 py-2 text-sm leading-6 text-ink"><span className="mr-2 font-semibold text-ink-muted">{String.fromCharCode(65 + optionIndex)}.</span><MathText text={option} /></li>)}
          </ol>
        </div>
        <button type="button" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink-heading transition hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:self-center" onClick={onToggle} aria-expanded={isExpanded} aria-controls={answerId}>
          {isExpanded ? 'Hide answer' : 'View answer'}
          {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
      </div>
      {isExpanded && (
        <div id={answerId} className="space-y-2 border-t border-line bg-canvas-muted/50 px-4 py-4 text-sm leading-6 text-ink sm:px-5" role="region" aria-label="Answer and explanation">
          <p className="font-medium text-ink-heading"><strong>Answer:</strong> <MathText text={answer} /></p>
          <p><MathText text={explanation} /></p>
        </div>
      )}
    </article>
  )
}
