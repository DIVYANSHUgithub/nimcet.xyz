import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Breadcrumbs from '../components/questions/Breadcrumbs'
import { bankQuestions, formatAttempts } from '../data/questionBank'

export default function QuestionDetail() {
  const { questionId } = useParams()
  const question = bankQuestions.find((q) => q.id === questionId)

  return (
    <div className="qb-page">
      <Navbar />
      <div className="container qb-page__breadcrumb-wrap">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Question Bank', href: '/questions' },
            { label: question ? 'Question' : 'Not found' },
          ]}
        />
      </div>

      <main className="container qb-detail">
        {!question ? (
          <div className="qb-empty">
            <p>Question not found.</p>
            <Link to="/questions" className="btn btn--secondary">
              Back to Question Bank
            </Link>
          </div>
        ) : (
          <article className="qb-detail__card">
            <div className="qb-detail__meta">
              <nav className="qb-question-card__breadcrumb" aria-label="Topic">
                <span>{question.chapter}</span>
                <span aria-hidden="true">&gt;</span>
                <span>{question.topic}</span>
              </nav>
              <span className={`badge badge--${question.difficulty.toLowerCase()}`}>
                {question.difficulty}
              </span>
            </div>

            <p className="qb-detail__text">{question.question}</p>

            <ul className="qb-detail__options">
              {question.options.map((opt, i) => (
                <li key={opt}>
                  {String.fromCharCode(65 + i)}. {opt}
                </li>
              ))}
            </ul>

            <div className="qb-detail__tags">
              <span>{question.type}</span>
              <span>{formatAttempts(question.attempts)} attempts</span>
            </div>

            <div className="qb-detail__answer">
              <p>
                <strong>Answer:</strong> {question.answer}
              </p>
              <p>{question.explanation}</p>
            </div>

            <Link to="/questions" className="btn btn--secondary">
              Back to Question Bank
            </Link>
          </article>
        )}
      </main>
      <Footer />
    </div>
  )
}
