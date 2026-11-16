import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Breadcrumbs from '../components/questions/Breadcrumbs'
import Container from '../components/ui/Container'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import QuestionOption from '../components/ui/QuestionOption'
import { QuestionMedia, QuestionOptionContent } from '../components/ui/QuestionMedia'
import { getQuestionById, getQuestionAnswer, submitPracticeAnswer } from '../lib/questionsApi'
import { normalizeQuestion } from '../utils/normalizeQuestion'
import RichContent from '../components/RichContent'

export default function QuestionDetail() {
  const { questionId } = useParams()
  const location = useLocation()
  const selectedOptionId = location.state?.selectedOptionId
  const [searchParams, setSearchParams] = useSearchParams()
  const revealAnswer = searchParams.get('answer') === 'show'
  const [answerRevision, setAnswerRevision] = useState(0)
  const [request, setRequest] = useState({ id: null, loading: true, question: null, error: '' })
  const [retryRevision, setRetryRevision] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [answerRequest, setAnswerRequest] = useState({ id: null, pending: false, error: '' })

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
  const answerState = answer && question && answer.questionId === question.id ? answer.state : null
  const hasCorrectOption = Boolean(question?.options.length === 4)
  useEffect(() => {
    if (!question || !revealAnswer) return undefined
    const controller = new AbortController()
    getQuestionAnswer(question.id, { signal: controller.signal })
      .then((feedback) => {
        if (controller.signal.aborted) return
        const selected = question.optionIds.indexOf(selectedOptionId)
        const correct = question.optionIds.indexOf(feedback.correct_option_id)
        setAnswer({ questionId: question.id, state: {
          selectedOptionIndex: selected < 0 ? null : selected, correctOptionIndex: correct,
          isCorrect: selected < 0 ? null : selected === correct, explanation: feedback.explanation, explanationBlocks: feedback.explanation_blocks,
        } })
        setAnswerRequest({ id: question.id, pending: false, error: '' })
      })
      .catch((reason) => {
        if (controller.signal.aborted || reason.name === 'AbortError') return
        setAnswerRequest({ id: question.id, pending: false, error: 'Unable to load the answer. Please try again.' })
      })
    return () => controller.abort()
  }, [question, revealAnswer, answerRevision, selectedOptionId])
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
      <Container className="pt-4"><Breadcrumbs items={breadcrumbItems} /></Container>
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
            <div className="mb-5 break-words text-base leading-7 text-ink-heading">
              {question.statementBlocks.length ? <RichContent blocks={question.statementBlocks} /> : <QuestionMedia text={question.question} imageUrl={question.questionImageUrl} />}
            </div>
            <h2 id="answer-options-heading" className="mb-2 text-sm font-semibold text-ink-heading">Choose your answer</h2>
            <p className="mb-4 text-sm leading-6 text-ink-muted">Select an option to check your answer, or view the correct answer and explanation.</p>
            <ol className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-labelledby="answer-options-heading">
              {question.options.map((option, index) => (
                <li key={`${question.id}-option-${index}`} className="min-w-0">
                  <QuestionOption
                    as="button"
                    type="button"
                    letter={String.fromCharCode(65 + index)}
                    content={option}
                    interactive={hasCorrectOption && !answerState && !revealAnswer}
                    selected={answerState?.selectedOptionIndex === index}
                    state={answerState?.correctOptionIndex === index ? 'correct' : answerState?.selectedOptionIndex === index ? 'incorrect' : undefined}
                    disabled={!hasCorrectOption || Boolean(answerState) || revealAnswer || (answerRequest.id === question.id && answerRequest.pending)}
                    aria-pressed={answerState?.selectedOptionIndex === index}
                    className="w-full"
                    onClick={async () => {
                      setAnswerRequest({ id: question.id, pending: true, error: '' })
                      try {
                        const feedback = await submitPracticeAnswer(question.id, question.optionIds[index], question.revision)
                        setAnswer({ questionId: question.id, state: { selectedOptionIndex: index,
                          correctOptionIndex: question.optionIds.indexOf(feedback.correct_option_id), isCorrect: feedback.is_correct,
                          explanation: feedback.explanation, explanationBlocks: feedback.explanation_blocks } })
                        setAnswerRequest({ id: question.id, pending: false, error: '' })
                      } catch {
                        setAnswerRequest({ id: question.id, pending: false, error: 'Unable to check your answer. Please try again.' })
                      }
                    }}
                  />
                </li>
              ))}
            </ol>
            {answerRequest.id === question.id && answerRequest.error && <p role="alert" className="text-danger">{answerRequest.error}</p>}
            {hasCorrectOption && !answerState && <Button variant="secondary" className="mb-4" disabled={revealAnswer && !(answerRequest.id === question.id && answerRequest.error)} onClick={() => {
              setAnswerRequest({ id: question.id, pending: true, error: '' })
              if (revealAnswer) setAnswerRevision((value) => value + 1)
              else setSearchParams((previous) => { previous.set('answer', 'show'); return previous })
            }}>View answer</Button>}
            <section className="rounded-lg border border-line bg-canvas-muted/50 p-4" aria-live="polite" aria-atomic="true">
              {!hasCorrectOption ? (
                <p className="text-sm text-ink-muted" role="status">An answer key is not available for this question yet.</p>
              ) : answerState ? (
                <>
                  <h2 className={`mb-2 text-sm font-semibold ${answerState.isCorrect === null ? 'text-ink-heading' : answerState.isCorrect ? 'text-success' : 'text-danger'}`}>
                    {answerState.isCorrect === null ? 'Answer and explanation' : answerState.isCorrect ? 'Correct' : 'Not quite'}
                  </h2>
                  <div className="mb-2 text-sm text-ink-heading"><strong>Correct answer:</strong>{' '}<QuestionOptionContent option={question.options[answerState.correctOptionIndex]} /></div>
                  {answerState.explanationBlocks?.length ? <RichContent blocks={answerState.explanationBlocks} /> : answerState.explanation ? (
                    <div className="text-sm leading-6 text-ink"><QuestionMedia text={answerState.explanation} /></div>
                  ) : (
                    <p className="text-sm text-ink-muted">No explanation is available for this question.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-muted" role="status">{revealAnswer && !(answerRequest.id === question.id && answerRequest.error) ? 'Loading answer…' : 'Choose an option or select View answer to read the explanation.'}</p>
              )}
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
