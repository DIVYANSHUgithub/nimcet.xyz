import VersionReview from './VersionReview'
import { useEffect, useState } from 'react'
import { backendGet, backendRequest } from '../../../clientFront/src/lib/backendApi'

const section = () => ({ key: crypto.randomUUID(), code: '', title: '', minutes: '', marks: '4', negative: '1', questions: [] })

export default function TestWorkspace({ roles }) {
  const [tests, setTests] = useState([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState('')
  const [template, setTemplate] = useState(null)
  const [revision, setRevision] = useState(0)
  const [loadedKey, setLoadedKey] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [exam, setExam] = useState('NIMCET')
  const [kind, setKind] = useState('full_length')
  const key = JSON.stringify([query, page, revision])
  useEffect(() => {
    const controller = new AbortController()
    backendGet('admin/tests', { params: { page, search: query }, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setTests(data); setLoadedKey(key); setError('') } })
      .catch(err => { if (!controller.signal.aborted) { setLoadedKey(key); setError(err.message) } })
    return () => controller.abort()
  }, [query, page, key])
  const test = tests.find(item => item.id === selected)
  return <section className="question-workspace" aria-label="Test management">
    <h2>Tests and versions</h2><p>Create a draft, configure its sections, and save a version for review.</p>
    {error && <p className="admin-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <form className="admin-form" inert={busy} aria-busy={busy} onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(''); setMessage('')
      try {
        const created = await backendRequest('admin/tests', { method: 'POST', body: { title, examination_code: exam, kind, visibility: 'public' } })
        setPage(1); setQuery(''); setSelected(created.id); setRevision(r => r + 1); setMessage('Test draft created. Configure its first version below.')
      } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}>
      <label>Title<input required maxLength={240} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label>Examination code<input required maxLength={80} value={exam} onChange={e => setExam(e.target.value)} /></label>
      <label>Category<select value={kind} onChange={e => setKind(e.target.value)}>{['full_length', 'section', 'subject', 'pyq', 'daily'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
      <button disabled={busy}>Create draft</button>
    </form>
    <label>Find tests<input value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} /></label>
    {loadedKey !== key && <p role="status">Loading tests…</p>}
    <label>Test<select value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); setTemplate(null) }}><option value="">Select a test</option>{tests.map(item => <option key={item.id} value={item.id}>{item.title} · {item.status} · {item.version_number ? `v${item.version_number} ${item.version_status}` : 'no versions'}</option>)}</select></label>
    {loadedKey === key && !error && tests.length === 0 && <p>No tests match your search.</p>}
    <div className="admin-role-actions"><button className="admin-secondary" disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}>Previous</button><button className="admin-secondary" disabled={tests.length < 30 || busy} onClick={() => setPage(p => p + 1)}>Next</button><button className="admin-secondary" onClick={() => setRevision(r => r + 1)}>Refresh</button></div>
    {test?.pass_required != null && <div className="admin-role-actions">
      <span>{test.pass_required ? 'Student Pass required' : 'Free test'}</span>
      {test.kind !== 'pyq' && roles.some(role => ['administrator', 'super_administrator'].includes(role)) &&
        <button className="admin-secondary" disabled={busy} onClick={async () => {
          setBusy(true); setError(''); setMessage('')
          try {
            await backendRequest(`admin/payments/tests/${test.id}`, { method: 'PATCH', body: { pass_required: !test.pass_required } })
            setRevision(r => r + 1); setMessage('Test access updated.')
          } catch (err) { setError(err.message) } finally { setBusy(false) }
        }}>{test.pass_required ? 'Make free' : 'Require Student Pass'}</button>}
    </div>}
    {test && <><VersionReview key={test.id} test={test} roles={roles} refreshKey={revision} onRevise={detail => setTemplate(detail)} onSaved={() => setRevision(r => r + 1)} />
      <VersionForm key={`${test.id}:${template?.id ?? 'new'}`} initialVersion={template} test={test} onSaved={() => setRevision(r => r + 1)} /></>}
  </section>
}

function localTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function VersionForm({ test, initialVersion, onSaved }) {
  const isPYQ = test.kind === 'pyq'
  const config = initialVersion?.configuration
  const [sections, setSections] = useState(() => config ? config.sections.map((s, index) => ({
    key: crypto.randomUUID(), code: s.code, title: s.title, marks: String(s.questions[0]?.marks ?? 4), negative: String(s.questions[0]?.negative_marks ?? 1),
    minutes: s.duration_seconds ? String(s.duration_seconds / 60) : '',
    questions: s.questions.map(q => ({ id: q.question_id, question: initialVersion.preview[index].questions.find(item => item.question_id === q.question_id)?.question_snapshot ?? 'Saved question', marks: q.marks, negative_marks: q.negative_marks,
      correct_option_override: q.correct_option_override, alternate_correct_option: q.alternate_correct_option, explanation_override: q.explanation_override })),
  })) : [section()])
  const [minutes, setMinutes] = useState(config ? config.duration_seconds / 60 : 60)
  const [shuffleQuestions, setShuffleQuestions] = useState(config?.shuffle_questions ?? false)
  const [shuffleOptions, setShuffleOptions] = useState(config?.shuffle_options ?? false)
  const [limit, setLimit] = useState(config?.attempt_limit ?? 1)
  const [availableFrom, setAvailableFrom] = useState(localTime(config?.available_from))
  const [availableUntil, setAvailableUntil] = useState(localTime(config?.available_until))
  const [resultMode, setResultMode] = useState(config?.review_policy.results ?? 'after_submit')
  const [answerMode, setAnswerMode] = useState(config?.review_policy.answers ?? 'with_results')
  const [resultTime, setResultTime] = useState(localTime(config?.review_policy.results_at))
  const [answerTime, setAnswerTime] = useState(localTime(config?.review_policy.answers_at))
  const [questions, setQuestions] = useState([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [paperYear, setPaperYear] = useState('')
  const questionYear = /^\d{4}$/.test(paperYear) && Number(paperYear) >= 1900 && Number(paperYear) <= 2200 ? paperYear : ''
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(null)
  const [sectionKey, setSectionKey] = useState(sections[0].key)
  useEffect(() => {
    const controller = new AbortController()
    backendGet('questions', { params: { exam: test.examination_code, search, page, page_size: 20,
      year: questionYear, pyq: questionYear ? true : undefined }, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setQuestions(data.items); setTotal(data.total) } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [test.examination_code, search, page, questionYear])
  const selectedSection = sections.find(s => s.key === sectionKey) ?? sections[0]
  const datetime = value => value ? new Date(value).toISOString() : null
  return <form className="admin-form" inert={busy} aria-busy={busy} onChange={() => setVersion(null)} onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const saved = await backendRequest(`admin/tests/${test.id}/versions`, { method: 'POST', body: {
        duration_seconds: Math.round(Number(minutes) * 60), attempt_limit: Number(limit),
        available_from: datetime(availableFrom), available_until: datetime(availableUntil), shuffle_questions: !isPYQ && shuffleQuestions, shuffle_options: !isPYQ && shuffleOptions,
        review_policy: { results: resultMode, results_at: resultMode === 'at_time' ? datetime(resultTime) : null, answers: answerMode, answers_at: answerMode === 'at_time' ? datetime(answerTime) : null },
        sections: sections.map((s, index) => ({ code: s.code, title: s.title, display_order: index,
          duration_seconds: s.minutes ? Math.round(Number(s.minutes) * 60) : null,
          questions: s.questions.map((q, order) => ({ question_id: q.id, display_order: order, marks: q.marks ?? s.marks, negative_marks: q.negative_marks ?? s.negative,
            correct_option_override: q.correct_option_override, alternate_correct_option: q.alternate_correct_option, explanation_override: q.explanation_override })) })),
      } })
      setVersion(saved); setMessage(`Version ${saved.version_number} saved with ${saved.question_count} questions.`); onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }}>
    <h3>Configure a new version: {test.title}</h3>{initialVersion && <p>Revising version {initialVersion.version_number}. Saving creates a new draft using the current published canonical questions; the original version remains intact.</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <label>Duration (minutes)<input type="number" required min="1" max="1440" value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
    <label>Attempts allowed<input type="number" required min="1" max="100" value={limit} onChange={e => setLimit(e.target.value)} /></label>
    <label>Opens at (local time)<input type="datetime-local" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} /></label>
    <label>Closes at (local time)<input type="datetime-local" value={availableUntil} onChange={e => setAvailableUntil(e.target.value)} /></label>
    <label>Results<select value={resultMode} onChange={e => setResultMode(e.target.value)}><option value="after_submit">After submission</option><option value="at_time">At a scheduled time</option><option value="never">Withhold</option></select></label>
    {resultMode === 'at_time' && <label>Result release time<input required type="datetime-local" value={resultTime} onChange={e => setResultTime(e.target.value)} /></label>}
    <label>Answer review<select value={answerMode} onChange={e => setAnswerMode(e.target.value)}><option value="with_results">With results</option><option value="at_time">At a scheduled time</option><option value="never">Withhold</option></select></label>
    {answerMode === 'at_time' && <label>Answer release time<input required type="datetime-local" value={answerTime} onChange={e => setAnswerTime(e.target.value)} /></label>}
    {!isPYQ && <>
      <label><input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} /> Shuffle questions within each section</label>
      <label><input type="checkbox" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} /> Shuffle answer options</label>
    </>}
    <fieldset><legend>Sections, in test order</legend>{sections.map(s => <div className="content-block" key={s.key}>
      <label>Section code<input required value={s.code} onChange={e => setSections(current => current.map(item => item.key === s.key ? { ...item, code: e.target.value } : item))} /></label>
      <label>Section title<input required value={s.title} onChange={e => setSections(current => current.map(item => item.key === s.key ? { ...item, title: e.target.value } : item))} /></label>
      <label>Section time limit (minutes)<input type="number" min="0.016" max="1440" step="any" value={s.minutes} onChange={e => setSections(current => current.map(item => item.key === s.key ? { ...item, minutes: e.target.value } : item))} /></label>
      <label>Default marks for new selections<input type="number" min="0.001" step="0.001" required value={s.marks} onChange={e => setSections(current => current.map(item => item.key === s.key ? { ...item, marks: e.target.value } : item))} /></label>
      <label>Default negative marks<input type="number" min="0" step="0.001" required value={s.negative} onChange={e => setSections(current => current.map(item => item.key === s.key ? { ...item, negative: e.target.value } : item))} /></label>
      <ol>{s.questions.map((q, index) => <li key={q.id}>#{q.id} {q.question.slice(0, 80)} <label>Marks<input type="number" min="0.001" step="0.001" value={q.marks ?? s.marks} onChange={e => setSections(current => current.map(item => item.key === s.key ? { ...item, questions: item.questions.map(question => question.id === q.id ? { ...question, marks: e.target.value } : question) } : item))} /></label><label>Negative marks<input type="number" min="0" step="0.001" value={q.negative_marks ?? s.negative} onChange={e => setSections(current => current.map(item => item.key === s.key ? { ...item, questions: item.questions.map(question => question.id === q.id ? { ...question, negative_marks: e.target.value } : question) } : item))} /></label><button type="button" onClick={() => { setVersion(null); setSections(current => current.map(item => item.key === s.key ? { ...item, questions: item.questions.filter(item => item.id !== q.id) } : item)) }}>Remove</button><button type="button" disabled={index === 0} onClick={() => { setVersion(null); setSections(current => current.map(item => { if (item.key !== s.key) return item; const ordered = [...item.questions]; [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]]; return { ...item, questions: ordered } })) }}>Move up</button></li>)}</ol>
      <button type="button" disabled={sections.length === 1} onClick={() => { setVersion(null); setSections(current => current.filter(item => item.key !== s.key)) }}>Remove section</button>
    </div>)}<button type="button" onClick={() => { setVersion(null); setSections(current => [...current, section()]) }}>Add section</button></fieldset>
    <fieldset><legend>Select published canonical questions</legend>
      <label>Add to section<select value={selectedSection.key} onChange={e => setSectionKey(e.target.value)}>{sections.map((s, index) => <option key={s.key} value={s.key}>{s.title || `Section ${index + 1}`}</option>)}</select></label>
      <label>Find questions<input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></label>
      {isPYQ && <label>Filter by recorded paper year<input inputMode="numeric" maxLength={4} value={paperYear} onChange={e => { setPaperYear(e.target.value); setPage(1) }} /></label>}
      {questions.length === 0 && <p>No published questions match these filters.</p>}
      <ul>{questions.map(q => <li key={q.id}><button type="button" disabled={busy || sections.some(s => s.questions.some(item => item.id === q.id))} onClick={() => { setVersion(null); setSections(current => current.map(s => s.key === selectedSection.key ? { ...s, questions: [...s.questions, { ...q, marks: s.marks, negative_marks: s.negative }] } : s)) }}>Add #{q.id}: {q.question.slice(0, 100)}</button></li>)}</ul>
      <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous questions</button><button type="button" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>More questions</button>
    </fieldset>
    <button disabled={busy || sections.some(s => s.questions.length === 0)}>Save new draft version</button>
    {version && <p>Use Existing versions and review above to submit this saved version for approval.</p>}
    {test.kind === 'pyq' && <p>Use PYQ verification to approve the original paper blueprint before publication.</p>}
  </form>
}
