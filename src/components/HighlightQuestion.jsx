
import { useState } from 'react'
import { Bookmark, ChevronDown, ChevronUp } from 'lucide-react'
import { highlightQuestion } from '../data/questions'
import LoginPrompt from './LoginPrompt'
import MathText from './questions/MathText'

export default function HighlightQuestion() {
  const [showAnswer, setShowAnswer] = useState(false)
  const [selectedOption, setSelectedOption] = useState('')
  const [loginMessage, setLoginMessage] = useState(null)

  const {
    subject,
    chapter,
    topic,
    difficulty,
    question,
    options,
    answer,
    explanation,
  } = highlightQuestion

  return (
    <>
      <article className="question-card question-card--featured">
        <div className="question-card__top">
          <div className="question-card__taxonomy">
            <span>{subject}</span>
            <span className="question-card__separator">/</span>
            <span>{chapter}</span>
            <span className="question-card__separator">/</span>
            <span>{topic}</span>
          </div>

          <span
            className={`badge badge--${difficulty.toLowerCase()}`}
          >
            {difficulty}
          </span>
        </div>

        <div className="question-card__prompt">
          <span className="question-card__label">
            PRACTICE QUESTION
          </span>

          <div className="question-card__text">
            <MathText>{question}</MathText>
          </div>
        </div>

        <fieldset className="question-card__options">
          <legend className="question-card__options-heading">
            Choose your answer
          </legend>

          {options.map((opt, i) => (
            <label
              key={i}
              className={`option ${
                selectedOption === String(i)
                  ? 'option--selected'
                  : ''
              }`}
            >
              <input
                type="radio"
                name="highlight-option"
                value={String(i)}
                checked={selectedOption === String(i)}
                onChange={() => setSelectedOption(String(i))}
              />

              <span className="option__letter">
                {String.fromCharCode(65 + i)}
              </span>

              <span className="option__label">
                <MathText>{String(opt)}</MathText>
              </span>
            </label>
          ))}
        </fieldset>

        {showAnswer && (
          <div
            className="question-card__answer"
            role="region"
            aria-label="Answer and explanation"
          >
            <p className="question-card__answer-text">
              <strong>Answer:</strong>{' '}
              <MathText>{String(answer)}</MathText>
            </p>

            <div className="question-card__explanation">
              <MathText>{explanation}</MathText>
            </div>
          </div>
        )}

        <div className="question-card__actions">
          <button
            type="button"
            className="btn btn--primary question-card__answer-button"
            onClick={() => setShowAnswer((current) => !current)}
            aria-expanded={showAnswer}
          >
            {showAnswer ? 'Hide Answer' : 'View Answer'}

            {showAnswer ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            onClick={() =>
              setLoginMessage(
                'Sign in to save questions to your bookmark list.'
              )
            }
          >
            <Bookmark size={16} />
            Save Question
          </button>
        </div>
      </article>

      <LoginPrompt
        message={loginMessage}
        onClose={() => setLoginMessage(null)}
      />
    </>
  )
}
