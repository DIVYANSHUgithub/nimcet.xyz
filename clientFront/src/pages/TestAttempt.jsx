import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleHelp, Clock3, Flag, LoaderCircle, Send, Wifi, WifiOff, X } from 'lucide-react'
import MathText from '../components/MathText'
import RichContent from '../components/RichContent'
import { QuestionOptionContent } from '../components/ui/QuestionMedia'
import Button from '../components/ui/Button'
import { ApiRequestError } from '../lib/backendApi'
import { getAttempt, saveAnswer, saveNavigation, submitAttempt } from '../lib/testsApi'

const EMPTY_QUESTIONS = []


function errorMessage(error) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'account_suspended') return 'Application access is suspended. Contact an administrator.'
    if (error.status === 401) return 'Your session expired. Sign in again to resume this attempt.'
    if (error.status === 404) return 'This attempt could not be found for your account.'
    if (error.status === 409) return 'The attempt changed or its deadline passed. Use Sync now to check its latest state.'
    if (error.status === 503) return 'The test service is temporarily unavailable. Your saved answers remain on the server.'
  }
  return 'We could not save that change. Check your connection and retry.'
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  return hours ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function counts(questions) {
  return {
    answered: questions.filter((question) => Boolean(question.answer.selected_option_id)).length,
    review: questions.filter((question) => question.state.marked_for_review).length,
    visited: questions.filter((question) => question.state.visited).length,
    unanswered: questions.filter((question) => !question.answer.selected_option_id).length,
  }
}

export default function TestAttempt() {
  const { user } = useAuth()
  const { attemptId } = useParams()
  return <TestAttemptPage key={`${user?.id ?? 'anonymous'}:${attemptId}`} />
}

function TestAttemptPage() {
  const { attemptId } = useParams()
  const [session, setSession] = useState(null)
  const questionList = session?.questions ?? EMPTY_QUESTIONS
  const [answers, setAnswers] = useState({})
  const [navigation, setNavigation] = useState({})
  const versionsRef = useRef({})
  const answerQueues = useRef(new Map())
  const navigationQueue = useRef(Promise.resolve())
  const pendingAnswers = useRef(new Map())
  const pendingNavigation = useRef(new Map())
  const syncPromise = useRef(null)
  const submissionLock = useRef(false)
  const automaticSubmission = useRef(false)
  const [selectedId, setSelectedId] = useState('')
  const [remaining, setRemaining] = useState(null)
  const deadlineRef = useRef(0)
  const [loadState, setLoadState] = useState('loading')
  const [message, setMessage] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [savingCount, setSavingCount] = useState(0)
  const [saveErrors, setSaveErrors] = useState({})
  const [syncing, setSyncing] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const hydrate = useCallback((data) => {
    setSession(data)
    const answerState = Object.fromEntries(data.questions.map((item) => [item.attempt_question_id, item.answer]))
    const navState = Object.fromEntries(data.questions.map((item) => [item.attempt_question_id, item.state]))
    const nextVersions = Object.fromEntries(data.questions.map((item) => [item.attempt_question_id, item.answer.version]))
    if (data.status === 'in_progress') {
      // A refresh must not replace an unsaved local choice with older server data.
      for (const [id, edit] of pendingAnswers.current) {
        if (answerState[id]) answerState[id] = { ...answerState[id], selected_option_id: edit.optionId }
      }
      for (const [id, edit] of pendingNavigation.current) {
        if (navState[id]) navState[id] = { visited: true, marked_for_review: edit.marked_for_review }
      }
    } else {
      if (pendingAnswers.current.size || pendingNavigation.current.size) {
        setMessage('The attempt has ended. Results use the answers saved on the server; unconfirmed changes could not be included.')
      }
      pendingAnswers.current.clear()
      pendingNavigation.current.clear()
      setSaveErrors({})
    }
    setAnswers(answerState)
    setNavigation(navState)
    versionsRef.current = nextVersions
    const firstUnanswered = data.questions.find((item) => !item.answer.selected_option_id)
    setSelectedId((current) => data.questions.some((item) => item.attempt_question_id === current) ? current : (firstUnanswered || data.questions[0])?.attempt_question_id || '')
    setRemaining(data.remaining_seconds)
    deadlineRef.current = performance.now() + data.remaining_seconds * 1000
    if (data.status !== 'in_progress') setLoadState('complete')
    else setLoadState('ready')
  }, [])

  const clearSaveError = useCallback((key) => setSaveErrors((old) => {
    const next = { ...old }
    delete next[key]
    return next
  }), [])

  const queueAnswer = useCallback((questionId, edit) => {
    const key = `answer:${questionId}`
    setSavingCount((count) => count + 1)
    const previous = answerQueues.current.get(questionId) || Promise.resolve()
    const request = previous.catch(() => {}).then(async () => {
      if (pendingAnswers.current.get(questionId) !== edit) return
      const saved = await saveAnswer(attemptId, questionId, {
        selected_option_id: edit.optionId, expected_version: versionsRef.current[questionId] ?? 0,
      })
      versionsRef.current[questionId] = saved.version
      if (pendingAnswers.current.get(questionId) === edit) {
        pendingAnswers.current.delete(questionId)
        clearSaveError(key)
      }
      // An older acknowledgement must not overwrite a newer local selection.
      setAnswers((old) => ({ ...old, [questionId]: {
        ...old[questionId], version: saved.version, saved_at: saved.saved_at,
        selected_option_id: pendingAnswers.current.has(questionId)
          ? pendingAnswers.current.get(questionId).optionId : saved.selected_option_id,
      } }))
    }).catch((error) => {
      if (pendingAnswers.current.get(questionId) === edit) {
        setSaveErrors((old) => ({ ...old, [key]: errorMessage(error) }))
      }
      throw error
    }).finally(() => {
      // Only the tail may remove this question's queue entry.
      if (answerQueues.current.get(questionId) === request) answerQueues.current.delete(questionId)
      setSavingCount((count) => Math.max(0, count - 1))
    })
    answerQueues.current.set(questionId, request)
    request.catch(() => {})
    return request
  }, [attemptId, clearSaveError])

  const queueNavigation = useCallback((payload) => {
    const id = payload.current_attempt_question_id
    const key = `navigation:${id}`
    setSavingCount((count) => count + 1)
    const next = navigationQueue.current.catch(() => {}).then(async () => {
      if (pendingNavigation.current.get(id) !== payload) return
      await saveNavigation(attemptId, payload)
      if (pendingNavigation.current.get(id) === payload) {
        pendingNavigation.current.delete(id)
        clearSaveError(key)
      }
    }).catch((error) => {
      if (pendingNavigation.current.get(id) === payload) setSaveErrors((old) => ({ ...old, [key]: errorMessage(error) }))
      throw error
    }).finally(() => setSavingCount((count) => Math.max(0, count - 1)))
    navigationQueue.current = next
    next.catch(() => {})
    return next
  }, [attemptId, clearSaveError])

  const waitForSaves = useCallback(async () => {
    // Include navigation/review writes and wait through every current answer tail.
    await Promise.allSettled([...answerQueues.current.values(), navigationQueue.current])
    while (answerQueues.current.size) await Promise.allSettled([...answerQueues.current.values()])
  }, [])

  const refreshSession = useCallback(({ quiet = false } = {}) => {
    if (syncPromise.current) return syncPromise.current
    if (submissionLock.current) return Promise.resolve(null)
    setSyncing(true)
    const request = (async () => {
      await waitForSaves()
      const data = await getAttempt(attemptId)
      hydrate(data)
      if (data.status !== 'in_progress') return data
      // A timed-out request may already have committed. Read first, then retry
      // only edits not confirmed by the server, using its current CAS version.
      for (const [id, edit] of pendingAnswers.current) {
        const saved = data.questions.find(q => q.attempt_question_id === id)?.answer
        if (!saved) continue
        if (saved.selected_option_id === edit.optionId) {
          pendingAnswers.current.delete(id)
          clearSaveError(`answer:${id}`)
        } else queueAnswer(id, edit)
      }
      for (const [id, edit] of pendingNavigation.current) {
        const saved = data.questions.find(q => q.attempt_question_id === id)?.state
        if (saved?.visited && saved.marked_for_review === edit.marked_for_review) {
          pendingNavigation.current.delete(id)
          clearSaveError(`navigation:${id}`)
        } else queueNavigation(edit)
      }
      await waitForSaves()
      if (!pendingAnswers.current.size && !pendingNavigation.current.size) {
        clearSaveError('sync')
        setMessage(quiet ? '' : 'Session refreshed. Your saved answers are up to date.')
      }
      return data
    })().catch((error) => {
      setSaveErrors((old) => ({ ...old, sync: errorMessage(error) }))
      throw error
    }).finally(() => {
      syncPromise.current = null
      setSyncing(false)
    })
    syncPromise.current = request
    return request
  }, [attemptId, clearSaveError, hydrate, queueAnswer, queueNavigation, waitForSaves])

  const persistNavigation = useCallback((payload) => {
    if (submissionLock.current || syncPromise.current) return
    pendingNavigation.current.set(payload.current_attempt_question_id, payload)
    queueNavigation(payload)
  }, [queueNavigation])

  useEffect(() => {
    let active = true
    getAttempt(attemptId).then((data) => { if (active) hydrate(data) }).catch((error) => {
      if (active) { setMessage(errorMessage(error)); setLoadState('error') }
    })
    return () => { active = false }
  }, [attemptId, hydrate])

  useEffect(() => {
    if (loadState !== 'ready' || !selectedId) return
    const question = questionList.find((item) => item.attempt_question_id === selectedId)
    if (!question) return
    persistNavigation({
      current_attempt_question_id: question.attempt_question_id,
      marked_for_review: navigation[question.attempt_question_id]?.marked_for_review ?? question.state.marked_for_review,
    })
  }, [loadState, navigation, persistNavigation, questionList, selectedId, session?.server_time])

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine)
      if (navigator.onLine && loadState === 'ready') refreshSession({ quiet: true }).catch(() => {})
    }
    const onFocus = () => { if (navigator.onLine && loadState === 'ready') refreshSession({ quiet: true }).catch(() => {}) }
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
      window.removeEventListener('focus', onFocus)
    }
  }, [loadState, refreshSession])

  useEffect(() => {
    if (loadState !== 'ready') return undefined
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((deadlineRef.current - performance.now()) / 1000))), 250)
    return () => window.clearInterval(timer)
  }, [loadState])

  const currentIndex = Math.max(0, questionList.findIndex((item) => item.attempt_question_id === selectedId))
  const current = questionList[currentIndex]
  const summary = useMemo(() => counts(questionList.map((item) => ({ ...item, answer: answers[item.attempt_question_id] || item.answer, state: navigation[item.attempt_question_id] || item.state }))), [questionList, answers, navigation])
  const questionGroups = useMemo(() => questionList.reduce((groups, question) => {
    const key = question.section_id
    if (!groups[key]) groups[key] = { id: key, title: question.section_title, questions: [] }
    groups[key].questions.push(question)
    return groups
  }, {}), [questionList])
  const [activeSection, setActiveSection] = useState('all')
  const visibleNumbers = questionList.filter((question) => activeSection === 'all' || question.section_id === activeSection)

  const navigateTo = useCallback((question) => {
    if (!question || submissionLock.current || syncPromise.current || !navigator.onLine) return
    setSelectedId(question.attempt_question_id)
    setNavigation((old) => ({ ...old, [question.attempt_question_id]: { ...(old[question.attempt_question_id] || question.state), visited: true } }))
  }, [])

  const selectOption = useCallback((optionId) => {
    if (!current || loadState !== 'ready' || submissionLock.current || syncPromise.current || !navigator.onLine) return
    const questionId = current.attempt_question_id
    const edit = { optionId }
    pendingAnswers.current.set(questionId, edit)
    setAnswers((old) => ({ ...old, [questionId]: { ...(old[questionId] || current.answer), selected_option_id: optionId } }))
    queueAnswer(questionId, edit)
  }, [current, loadState, queueAnswer])

  const markReview = useCallback(() => {
    if (!current || loadState !== 'ready' || submissionLock.current || syncPromise.current || !navigator.onLine) return
    const questionId = current.attempt_question_id
    const marked = !(navigation[questionId]?.marked_for_review ?? current.state.marked_for_review)
    setNavigation((old) => ({ ...old, [questionId]: { ...(old[questionId] || current.state), visited: true, marked_for_review: marked } }))
    // The navigation effect persists this change once, through the same queue.
  }, [current, loadState, navigation])

  const submit = useCallback(async (automatic = false) => {
    if (submissionLock.current || syncPromise.current || loadState !== 'ready') return
    submissionLock.current = true
    setSubmitting(true)
    setConfirmSubmit(false)
    setMessage(automatic ? 'Time is up. Submitting your saved answers…' : '')
    let sent = false
    try {
      await waitForSaves()
      if (!automatic && (pendingAnswers.current.size || pendingNavigation.current.size)) {
        setMessage('Some changes are not saved. Use Sync now before submitting.')
        return
      }
      sent = true
      const result = await submitAttempt(attemptId)
      setMessage(pendingAnswers.current.size || pendingNavigation.current.size
        ? 'Some changes were not saved before the attempt ended. Results use the answers saved on the server.' : '')
      setReceipt(result)
      setLoadState('complete')
    } catch (error) {
      setMessage(errorMessage(error))
      if (sent) {
        // Submission might have committed despite a lost response. Reconcile it
        // without discarding unconfirmed local selections on an active test.
        try { hydrate(await getAttempt(attemptId)) } catch { /* retain retry state */ }
      }
    } finally {
      submissionLock.current = false
      setSubmitting(false)
    }
  }, [attemptId, hydrate, loadState, waitForSaves])

  useEffect(() => {
    if (remaining !== 0 || loadState !== 'ready' || submitting || syncing || automaticSubmission.current) return undefined
    const timer = window.setTimeout(() => { automaticSubmission.current = true; submit(true) }, 0)
    return () => window.clearTimeout(timer)
  }, [remaining, loadState, submitting, syncing, submit])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (confirmSubmit) { if (event.key === 'Escape') setConfirmSubmit(false); return }
      if (event.key >= '1' && event.key <= '9' && current?.options[Number(event.key) - 1]) selectOption(current.options[Number(event.key) - 1].id)
      if (event.key === 'ArrowRight') navigateTo(questionList[currentIndex + 1])
      if (event.key === 'ArrowLeft') navigateTo(questionList[currentIndex - 1])
      if (event.key.toLowerCase() === 'r') markReview()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmSubmit, current, currentIndex, markReview, navigateTo, questionList, selectOption])

  if (loadState === 'loading') return <main className="grid min-h-svh place-items-center bg-canvas px-5"><div className="flex items-center gap-3 text-sm text-ink-muted" role="status"><LoaderCircle className="animate-spin" size={18} />Loading your saved attempt…</div></main>

  if (loadState === 'error') return <main className="grid min-h-svh place-items-center bg-canvas px-5"><section className="max-w-lg rounded-2xl border border-danger-border bg-danger-bg p-6" role="alert"><h1 className="text-xl font-semibold text-ink-heading">Attempt unavailable</h1><p className="mt-2 text-sm leading-6 text-danger">{message}</p><div className="mt-5 flex flex-wrap gap-3">{message.includes('Sign in') ? <Button as={Link} to="/login" state={{ from: `/attempts/${attemptId}` }}>Sign in</Button> : <Button onClick={() => { setLoadState('loading'); refreshSession().catch(() => setLoadState('error')) }}>Retry</Button>}<Button as={Link} to="/tests" variant="secondary">Back to tests</Button></div></section></main>

  if (loadState === 'complete') return (
    <main className="grid min-h-svh place-items-center bg-canvas px-5 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-line bg-surface p-7 text-center shadow-featured sm:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-success-bg text-success"><CheckCircle2 size={28} /></div>
        <h1 className="mt-5 text-2xl font-bold text-ink-heading">{receipt?.submission_reason === 'timer_expired' || session?.status === 'expired' ? 'Time is up' : 'Attempt submitted'}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">Your responses have been recorded. Results and answer review will become available according to the test’s release settings.</p>
        {message && <p className="mt-4 text-sm text-warning" role="status">{message}</p>}
        {receipt && <p className="mt-4 text-xs text-ink-muted">Submitted {receipt.submitted_at ? new Date(receipt.submitted_at).toLocaleString() : 'successfully'}</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button as={Link} to={`/attempts/${attemptId}/result`}>View result</Button><Button as={Link} to="/tests" variant="secondary">Back to tests</Button></div>
      </section>
    </main>
  )

  if (!session || !current) return <main className="grid min-h-svh place-items-center bg-canvas px-5"><section className="rounded-xl border border-line p-6 text-center"><h1 className="font-semibold text-ink-heading">No questions in this attempt</h1><Link to="/tests" className="mt-3 inline-block text-sm text-accent underline">Back to tests</Link></section></main>

  const selectedOption = (answers[current.attempt_question_id] || current.answer).selected_option_id
  const currentReview = navigation[current.attempt_question_id]?.marked_for_review ?? current.state.marked_for_review
  const timerUrgent = remaining <= 300
  const timerCritical = remaining <= 60
  const saveError = Object.values(saveErrors)[0]
  const displayMessage = saveError || message
  const actionsPaused = !online || syncing || submitting || remaining === 0
  const saveLabel = !online ? 'Offline' : syncing ? 'Syncing…' : saveError ? 'Unsaved changes' : savingCount ? 'Saving…' : 'Autosaved'

  return (
    <div className="flex min-h-svh flex-col bg-canvas-subtle">
      <header className="sticky top-0 z-30 border-b border-line bg-surface shadow-card">
        <div className="mx-auto flex min-h-[4.25rem] max-w-[90rem] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><Link to="/tests" className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-ink-muted hover:bg-canvas-muted" aria-label="Exit to test list"><ArrowLeft size={17} /></Link><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-heading">{session.test_title}</p><p className="text-xs text-ink-muted">Attempt in progress</p></div></div>
          <div className="flex items-center gap-3"><span className={`hidden items-center gap-1.5 text-xs sm:inline-flex ${online && !saveError ? 'text-success' : 'text-danger'}`} aria-live="polite">{online ? <Wifi size={14} /> : <WifiOff size={14} />}{saveLabel}</span><div className={`flex min-w-[6.6rem] items-center justify-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-bold tabular-nums ${timerCritical ? 'bg-danger-bg text-danger' : timerUrgent ? 'bg-warning-bg text-warning' : 'bg-canvas-subtle text-ink-heading'}`} role="timer" aria-label={`Time remaining ${formatTime(remaining)}`}><Clock3 size={17} />{formatTime(remaining)}</div><Button size="sm" onClick={() => setConfirmSubmit(true)} disabled={submitting || syncing || !online}>Submit</Button></div>
        </div>
        {timerUrgent && <div className={`h-1 ${timerCritical ? 'bg-danger' : 'bg-warning'}`} style={{ width: `${Math.max(1, Math.min(100, remaining / Math.max(1, session.remaining_seconds) * 100))}%` }} />}
      </header>

      <div className="mx-auto grid w-full max-w-[90rem] flex-1 gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-5 lg:px-7 lg:py-6">
        <main className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-ink-muted"><span className="font-semibold text-ink-heading">Question {currentIndex + 1}</span><span>of {questionList.length}</span><span className="hidden text-line-strong sm:inline">·</span><span className="hidden sm:inline">{current.section_title}</span></div>
            <div className="flex items-center gap-3"><span className="text-xs text-ink-muted" aria-live="polite">{syncing ? 'Syncing changes…' : saveError ? 'Changes not saved' : savingCount ? 'Saving changes…' : 'Saved automatically'}</span><button type="button" onClick={markReview} disabled={actionsPaused} className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 ${currentReview ? 'border-warning-border bg-warning-bg text-warning' : 'border-line text-ink-muted hover:bg-canvas-muted'}`} aria-pressed={currentReview}><Flag size={14} />{currentReview ? 'Marked for review' : 'Mark for review'}</button></div>
          </div>

          {!online && <div className="mb-4 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">Connection lost. Test actions are paused until you reconnect; previously saved answers are safe.</div>}
          {displayMessage && <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning" role="status"><span>{displayMessage}</span><button type="button" disabled={syncing || submitting || !online} onClick={() => refreshSession().catch(() => {})} className="shrink-0 font-semibold underline">Sync now</button></div>}

          <section className="min-h-[22rem] rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8" aria-labelledby="question-heading">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{current.section_title} <span className="px-1 text-line-strong">/</span> Q{currentIndex + 1}</p>
            <h1 id="question-heading" className="mt-5 text-lg font-medium leading-8 text-ink-heading sm:text-xl">{current.statement_blocks?.length ? <RichContent blocks={current.statement_blocks} /> : <MathText text={current.question} />}</h1>
            <div className="mt-7 grid gap-3">
              {current.options.map((option, index) => {
                const isSelected = selectedOption === option.id
                return <button key={option.id} type="button" onClick={() => selectOption(option.id)} disabled={actionsPaused} className={`group flex min-h-[3.75rem] w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 ${isSelected ? 'border-option-selected-border bg-option-selected' : 'border-line bg-surface hover:border-line-strong hover:bg-option-hover'}`} aria-pressed={isSelected}>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${isSelected ? 'border-brand bg-brand text-white' : 'border-line-strong text-ink-muted group-hover:border-accent'}`}>{String.fromCharCode(65 + index)}</span>
                  <span className="min-w-0 flex-1 pt-0.5 text-sm leading-6 text-ink"><QuestionOptionContent option={option.content} /></span>
                  {isSelected && <Check size={17} className="mt-1 shrink-0 text-accent" aria-hidden="true" />}
                </button>
              })}
            </div>
            {selectedOption != null && <Button variant="secondary" size="sm" className="mt-4" disabled={actionsPaused} onClick={() => selectOption(null)}>Clear answer</Button>}
          </section>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
            <Button variant="secondary" disabled={actionsPaused || currentIndex === 0} onClick={() => navigateTo(questionList[currentIndex - 1])}><ArrowLeft size={16} /> Previous</Button>
            <span className="hidden text-xs text-ink-muted sm:inline">Keyboard: 1–4 select · ← → navigate · R review</span>
            <Button disabled={actionsPaused || currentIndex >= questionList.length - 1} onClick={() => navigateTo(questionList[currentIndex + 1])}>Save & next <ArrowRight size={16} /></Button>
          </div>
        </main>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-4 shadow-card lg:sticky lg:top-[5.5rem]" aria-label="Question navigator">
          <div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-ink-heading">Question map</h2><span className="text-xs text-ink-muted">{summary.answered}/{questionList.length} answered</span></div>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[0.6875rem] text-ink-muted"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-success" />Answered</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full border border-line-strong" />Unanswered</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-warning" />Review</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-accent" />Current</span></div>
          {Object.values(questionGroups).length > 1 && <label className="mt-4 block"><span className="sr-only">Filter question map by section</span><select className="min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" value={activeSection} onChange={(event) => setActiveSection(event.target.value)}><option value="all">All sections</option>{Object.values(questionGroups).map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label>}
          <div className="mt-3 grid max-h-[min(52vh,32rem)] grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 lg:grid-cols-5" aria-label="Select a question">
            {visibleNumbers.map((question) => {
              const answer = answers[question.attempt_question_id] || question.answer
              const state = navigation[question.attempt_question_id] || question.state
              const number = questionList.indexOf(question) + 1
              const currentQuestion = question.attempt_question_id === selectedId
              const tone = currentQuestion ? 'border-accent bg-accent text-white' : state.marked_for_review ? 'border-warning bg-warning text-white' : answer.selected_option_id ? 'border-success bg-success text-white' : state.visited ? 'border-accent/40 bg-info-bg text-info' : 'border-line bg-surface text-ink-muted hover:bg-canvas-muted'
              return <button key={question.attempt_question_id} type="button" onClick={() => navigateTo(question)} disabled={actionsPaused} className={`relative grid aspect-square min-h-10 place-items-center rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 ${tone}`} aria-label={`Question ${number}${answer.selected_option_id ? ', answered' : ', unanswered'}${state.marked_for_review ? ', marked for review' : ''}`} aria-current={currentQuestion ? 'step' : undefined}>{number}{state.marked_for_review && !currentQuestion && <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-surface bg-warning" />}</button>
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center"><div><p className="text-lg font-bold text-ink-heading">{summary.answered}</p><p className="text-[0.6875rem] text-ink-muted">Answered</p></div><div><p className="text-lg font-bold text-ink-heading">{summary.unanswered}</p><p className="text-[0.6875rem] text-ink-muted">Left blank</p></div><div><p className="text-lg font-bold text-warning">{summary.review}</p><p className="text-[0.6875rem] text-ink-muted">Review</p></div></div>
          <button type="button" disabled={actionsPaused} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-canvas-subtle px-3 text-sm font-semibold text-ink-heading hover:bg-canvas-muted disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setConfirmSubmit(true)}><Send size={15} />Review & submit</button>
          <p className="mt-3 flex items-start gap-2 text-[0.6875rem] leading-5 text-ink-muted"><CircleHelp size={14} className="mt-0.5 shrink-0" />Your answers save to your account as you work. Keep this page open until you are back online if your connection drops.</p>
        </aside>
      </div>

      {confirmSubmit && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-heading/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmSubmit(false) }}><section role="dialog" aria-modal="true" aria-labelledby="submit-title" className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-featured sm:p-7"><div className="flex items-start justify-between gap-3"><div><h2 id="submit-title" className="text-xl font-bold text-ink-heading">Review before submitting</h2><p className="mt-1 text-sm text-ink-muted">You cannot change your answers after submission.</p></div><button type="button" className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-canvas-muted" onClick={() => setConfirmSubmit(false)} aria-label="Close dialog"><X size={18} /></button></div><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-xl bg-success-bg p-3 text-center"><p className="text-xl font-bold text-success">{summary.answered}</p><p className="text-xs text-ink-muted">Answered</p></div><div className="rounded-xl bg-warning-bg p-3 text-center"><p className="text-xl font-bold text-warning">{summary.review}</p><p className="text-xs text-ink-muted">For review</p></div><div className="rounded-xl bg-canvas-subtle p-3 text-center"><p className="text-xl font-bold text-ink-heading">{summary.unanswered}</p><p className="text-xs text-ink-muted">Unanswered</p></div></div>{summary.unanswered > 0 && <p className="mt-4 rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning">You still have {summary.unanswered} unanswered {summary.unanswered === 1 ? 'question' : 'questions'}.</p>}<div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row"><Button variant="secondary" onClick={() => setConfirmSubmit(false)}>Continue test</Button><Button onClick={() => submit(false)} disabled={submitting || syncing || !online}>{submitting ? 'Submitting…' : 'Submit attempt'} <ArrowRight size={16} /></Button></div></section></div>}
    </div>
  )
}
