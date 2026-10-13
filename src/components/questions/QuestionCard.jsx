import { ArrowRight, Bookmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import MathText from '../MathText'
import Badge from '../ui/Badge'

export default function QuestionCard({ question, index, onBookmark }) {
  const { id, subject, topic, difficulty, question: prompt, options = [], type, exam, examYear, questionNumber } = question

  return (
    <article className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <span className="font-semibold text-ink-heading">Q{questionNumber ?? index}</span>
          {subject && <span>{subject}</span>}
          {topic && <><span aria-hidden="true">/</span><span>{topic}</span></>}
        </div>
        <Badge>{difficulty || 'Difficulty not provided'}</Badge>
      </div>

      <div className="mb-4 break-words text-[15px] font-medium leading-7 text-ink-heading">
        <MathText text={prompt} />
      </div>

      {options.length > 0 && (
        <ol className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Answer options">
          {options.map((option, optionIndex) => (
            <li key={`${id}-option-${optionIndex}`} className="min-w-0 rounded-lg border border-line bg-canvas-muted/50 px-3 py-2.5 text-sm leading-6 text-ink">
              <span className="mr-2 font-semibold text-ink-muted">{String.fromCharCode(65 + optionIndex)}.</span>
              <MathText text={option} />
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
          {type && <span>{type}</span>}
          {exam && <span>{exam}{examYear ? ` ${examYear}` : ''}</span>}
          {!exam && examYear && <span>Exam year: {examYear}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/questions/${encodeURIComponent(id)}`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-heading px-3.5 text-sm font-semibold text-white transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            View question <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <button type="button" className="grid size-10 place-items-center rounded-md border border-line-strong bg-surface text-ink-muted transition hover:bg-canvas-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => onBookmark?.(question)} aria-label="Save question">
            <Bookmark size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}
