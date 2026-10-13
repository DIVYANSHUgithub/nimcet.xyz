import { ChevronDown, ChevronUp } from 'lucide-react'

export default function DailyQuestionCard({
  question,
  index,
  total,
  isExpanded,
  onToggle,
}) {
  const { difficulty, question: text, options, answer, explanation } = question

  return (
    <article className={`daily-question ${isExpanded ? 'daily-question--expanded' : ''}`}>
      <div className="daily-question__main">
        <div className="daily-question__content">
          <div className="daily-question__header">
            <span className="daily-question__number">
              Question {index + 1} of {total}
            </span>
            <span className={`badge badge--${difficulty.toLowerCase()}`}>{difficulty}</span>
          </div>
          <p className="daily-question__text">{text}</p>
          <div className="daily-question__options">
            {options.map((opt, i) => (
              <span key={opt} className="daily-question__option">
                {String.fromCharCode(65 + i)}. {opt}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="daily-question__toggle"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Hide Answer' : 'View Answer'}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="daily-question__answer" role="region" aria-label="Answer and explanation">
          <p>
            <strong>Answer:</strong> {answer}
          </p>
          <p>{explanation}</p>
        </div>
      )}
    </article>
  )
}
