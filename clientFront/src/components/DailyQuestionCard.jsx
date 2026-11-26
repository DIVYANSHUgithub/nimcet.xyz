import { ArrowRight, CircleCheck, CircleX } from 'lucide-react'
import { Link } from 'react-router-dom'
import RichContent from './RichContent'
import Badge from './ui/Badge'
import Button from './ui/Button'
import QuestionOption, { OptionGrid } from './ui/QuestionOption'
import { difficultyTone } from '../utils/difficultyTone'
import { QuestionMedia, QuestionOptionContent } from './ui/QuestionMedia'

const feedback = {
  correct: { label: 'Correct', color: 'text-success', Icon: CircleCheck },
  incorrect: { label: 'Incorrect', color: 'text-danger', Icon: CircleX },
  unavailable: { label: 'Answer unavailable', color: 'text-ink-muted' },
  unanswered: { label: 'Skipped', color: 'text-ink-muted' },
}

export default function DailyQuestionCard({ question, index, total, selectedOptionId, onSelect, locked, result }) {
  const { id, difficulty, question: prompt, questionImageUrl, statementBlocks, options, optionIds } = question
  const resultState = result === true ? 'correct' : result === false ? 'incorrect' : undefined
  const feedbackState = feedback[resultState ?? (result === null ? 'unavailable' : result)]
  const titleId = `daily-question-${id}`

  return (
    <article className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-6" aria-labelledby={titleId}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="text-sm font-semibold text-ink-muted">Question {index + 1} of {total}</h3>
        {difficulty && <Badge tone={difficultyTone(difficulty)}>{difficulty}</Badge>}
      </div>
      <div className="mb-4 break-words text-base font-medium leading-7 text-ink-heading">
        {statementBlocks.length ? <RichContent blocks={statementBlocks} /> : <QuestionMedia text={prompt} imageUrl={questionImageUrl} />}
      </div>
      <fieldset disabled={locked} className="min-w-0" aria-labelledby={titleId}>
        <OptionGrid>
          {options.map((option, optionIndex) => {
            const optionId = optionIds[optionIndex]
            const selected = selectedOptionId === optionId
            const letter = String.fromCharCode(65 + optionIndex)

            return (
              <QuestionOption key={optionId} as="label" letter={letter} interactive={!locked}
                selected={selected && !resultState} state={selected ? resultState : undefined}>
                <input className="sr-only" type="radio" name={titleId} value={optionId} checked={selected} onChange={() => onSelect(optionId)} />
                <span className="sr-only">{letter}. </span>
                <QuestionOptionContent option={option} />
              </QuestionOption>
            )
          })}
        </OptionGrid>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3">
        {feedbackState && (
          <p className={`mr-auto flex items-center gap-1.5 text-sm font-semibold ${feedbackState.color}`}>
            {feedbackState.Icon && <feedbackState.Icon size={16} aria-hidden="true" />}
            {feedbackState.label}
          </p>
        )}
        <Button as={Link} variant="monochrome" to={`/questions/${encodeURIComponent(id)}?answer=show`} state={{ selectedOptionId }}
          aria-label={`View answer for question ${index + 1}`}>
          View answer <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </article>
  )
}
