import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Breadcrumbs from '../components/questions/Breadcrumbs'
import Container from '../components/ui/Container'
import MathText from '../components/MathText'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { getQuestionById } from '../lib/questionsApi'
import { normalizeQuestion } from '../utils/normalizeQuestion'

export default function QuestionDetail() {
  const { questionId } = useParams()
  const [request, setRequest] = useState({ id: null, loading: true, question: null, error: '' })
  const [retryRevision, setRetryRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getQuestionById(questionId, { signal: controller.signal })
      .then((row) => setRequest({ id: questionId, loading: false, question: row ? normalizeQuestion(row) : null, error: '' }))
      .catch((reason) => {
        if (controller.signal.aborted || reason.name === 'AbortError') return
        console.error('Question detail loading failed:', reason)
        setRequest({ id: questionId, loading: false, question: null, error: 'Unable to load this question. Please try again.' })
      })
    return () => controller.abort()
  }, [questionId, retryRevision])

  const isCurrentRequest = request.id === questionId
  const loading = !isCurrentRequest || request.loading
  const error = isCurrentRequest ? request.error : ''
  const question = isCurrentRequest ? request.question : null

  const retry = () => {
    setRequest((current) => ({ ...current, loading: true, error: '' }))
    setRetryRevision((revision) => revision + 1)
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Question Bank', href: '/questions' },
    { label: question ? `Question ${question.questionNumber ?? question.id}` : 'Question' },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <Container className="pt-4">
        <Breadcrumbs items={breadcrumbItems} />
      </Container>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-12 pt-4 md:px-8">
        {loading ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-muted" role="status">Loading question…</div>
        ) : error ? (
          <div className="rounded-xl border border-danger-border bg-danger-bg p-6" role="alert">
            <p className="mb-4 text-sm text-danger">{error}</p>
            <Button variant="secondary" onClick={retry}>Try again</Button>
          </div>
        ) : !question ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-center">
            <h1 className="text-lg font-semibold text-ink-heading">Question not found</h1>
            <p className="mt-2 text-sm text-ink-muted">This question may have been removed or is not published.</p>
            <Link to="/questions" className="mt-5 inline-flex min-h-10 items-center rounded-md bg-ink-heading px-4 text-sm font-semibold text-white hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Back to Question Bank</Link>
          </div>
        ) : (
          <article className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-ink-heading">Question {question.questionNumber ?? question.id}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                  {question.subject && <span>{question.subject}</span>}
                  {question.topic && <><span aria-hidden="true">/</span><span>{question.topic}</span></>}
                </div>
              </div>
              <Badge>{question.difficulty || 'Difficulty not provided'}</Badge>
            </div>

            <div className="mb-5 break-words text-base leading-7 text-ink-heading"><MathText text={question.question} /></div>

            <ol className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Answer options">
              {question.options.map((option, index) => (
                <li key={`${question.id}-option-${index}`} className={`min-w-0 rounded-lg border px-3 py-3 text-sm leading-6 ${question.correctOptionIndex === index ? 'border-success-border bg-success-bg text-ink-heading' : 'border-line bg-canvas-muted/40 text-ink'}`}>
                  <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span><MathText text={option} />
                </li>
              ))}
            </ol>

            <section className="rounded-lg border border-line bg-canvas-muted/50 p-4" aria-labelledby="answer-heading">
              <h2 id="answer-heading" className="mb-2 text-sm font-semibold text-ink-heading">Answer and explanation</h2>
              <p className="mb-2 text-sm text-ink-heading"><strong>Answer:</strong>{' '}<MathText text={question.correctAnswer || 'Not provided'} /></p>
              <div className="text-sm leading-6 text-ink"><MathText text={question.explanation || 'No explanation is available for this question.'} /></div>
            </section>

            <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted">
              {question.exam && <div><dt className="inline font-medium">Exam: </dt><dd className="inline">{question.exam}</dd></div>}
              {question.examYear && <div><dt className="inline font-medium">Year: </dt><dd className="inline">{question.examYear}</dd></div>}
              {question.source && <div><dt className="inline font-medium">Source: </dt><dd className="inline">{question.source}</dd></div>}
            </dl>
            <Link to="/questions" className="mt-6 inline-flex min-h-10 items-center rounded-md border border-line-strong px-4 text-sm font-semibold text-ink-heading transition hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Back to Question Bank</Link>
          </article>
        )}
      </main>
      <Footer />
    </div>
  )
}
