
import { ArrowRight, Bookmark, ClipboardList, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatAttempts } from '../../data/questionBank'
import MathText from '../MathText'

export default function QuestionCard({ question, index, onBookmark }) {
  const {
    id,
    chapter,
    topic,
    difficulty,
    question: text,
    options = [],
    type,
    attempts,
  } = question

  return (
    <article className="qb-question-card">
      <div className="qb-question-card__body">
        <div className="qb-question-card__left">
          <span className="qb-question-card__num">Q{index}</span>

          <div className="qb-question-card__main">
            <div className="qb-question-card__meta-row">
              <nav
                className="qb-question-card__breadcrumb"
                aria-label="Topic"
              >
                <span>{chapter}</span>
                <span aria-hidden="true">&gt;</span>
                <span>{topic}</span>
              </nav>

              <span
                className={`badge badge--${(difficulty || 'Medium').toLowerCase()}`}
              >
                {difficulty || 'Medium'}
              </span>
            </div>

            <div className="qb-question-card__text">
              <MathText text={text || ''} />
            </div>

           <div className="qb-question-card__options">
              {options.map((opt, i) => (
                <span
                  key={`${id}-option-${i}`}
                  className="qb-question-card__option"
                >
                  {String.fromCharCode(65 + i)}.{' '}
                  <MathText text={String(opt ?? '')} />
                </span>
              ))}
            </div>

            <div className="qb-question-card__tags">
              <span className="qb-question-card__tag">
                <ClipboardList size={13} aria-hidden="true" />
                {type || 'MCQ'}
              </span>

              <span className="qb-question-card__tag">
                <Users size={13} aria-hidden="true" />
                {formatAttempts(attempts || 0)} attempts
              </span>
            </div>
          </div>
        </div>

        <div className="qb-question-card__actions">
          <Link to={`/questions/${id}`} className="qb-question-card__view">
            View Question
            <ArrowRight size={16} />
          </Link>

          <button
            type="button"
            className="qb-question-card__bookmark"
            onClick={() => onBookmark?.(question)}
            aria-label="Save question"
          >
            <Bookmark size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}
