import { Link } from 'react-router-dom'
import RichContent from './RichContent'
import Badge from './ui/Badge'
import { difficultyTone } from '../utils/difficultyTone'
import { QuestionMedia, QuestionOptionContent } from './ui/QuestionMedia'

export default function DailyQuestionCard({ question, index, total }) {
  const { id, difficulty, question: prompt, questionImageUrl, options = [] } = question

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Question {index + 1} of {total}</span>
            <Badge tone={difficultyTone(difficulty)}>{difficulty || 'Difficulty not provided'}</Badge>
          </div>
          <div className="mb-3 break-words text-sm font-medium leading-6 text-ink-heading">{question.statementBlocks?.length ? <RichContent blocks={question.statementBlocks} /> : <QuestionMedia text={prompt} imageUrl={questionImageUrl} />}</div>
          <ol className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2" aria-label="Answer options">
            {options.map((option, optionIndex) => <li key={`${id}-option-${optionIndex}`} className="min-w-0 rounded-md border border-line bg-canvas-muted/50 px-3 py-2 text-sm leading-6 text-ink"><span className="mr-2 font-semibold text-ink-muted">{String.fromCharCode(65 + optionIndex)}.</span><QuestionOptionContent option={option} /></li>)}
          </ol>
        </div>
        <Link to={`/questions/${encodeURIComponent(id)}`} className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-line-strong px-3 text-sm font-medium text-ink-heading">Practice question</Link>
      </div>
    </article>
  )
}
