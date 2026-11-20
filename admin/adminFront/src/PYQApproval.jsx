import { useEffect, useState } from 'react'
import { backendGet, backendRequest } from '../../../clientFront/src/lib/backendApi'

const blankGroup = () => ({ title: '', question_count: 1, marks: '4', negative_marks: '1' })
const blankSection = () => ({ code: '', minutes: '', groups: [blankGroup()] })

export default function PYQApproval({ roles }) {
  const [request, setRequest] = useState(null)
  const [selected, setSelected] = useState('')
  const [message, setMessage] = useState('')
  const [revision, setRevision] = useState(0)
  const canApprove = roles.some(role => ['administrator', 'super_administrator'].includes(role))

  useEffect(() => {
    const controller = new AbortController()
    backendGet('admin/pyq/candidates', { signal: controller.signal })
      .then(items => { if (!controller.signal.aborted) setRequest({ items, revision }) })
      .catch(error => { if (!controller.signal.aborted) setRequest({ error: error.message, revision }) })
    return () => controller.abort()
  }, [revision])

  const current = request?.revision === revision ? request : null
  const candidate = current?.items?.find(item => item.test_version_id === selected)

  function published() {
    setMessage('PYQ test published. It is now visible in the public PYQ test list.')
    setSelected('')
    setRevision(value => value + 1)
  }

  function rememberApproval(approval) {
    setRequest(previous => ({ ...previous, items: previous.items.map(item =>
      item.test_version_id === selected ? { ...item, approval } : item) }))
  }

  return (
    <section className="question-workspace" aria-label="PYQ paper approval">
      <h2>PYQ verification and publication</h2>
      <p>Create a PYQ test in Test authoring, arrange the questions in original paper order, and complete version review before verifying the source and answer key here.</p>
      {message && <p role="status">{message}</p>}
      <button type="button" onClick={() => setRevision(value => value + 1)}>Refresh draft papers</button>
      {!current && <p role="status">Loading draft papers…</p>}
      {current?.error && <p role="alert" className="admin-error">{current.error}</p>}
      {current?.items?.length === 0 && <p>No draft PYQ versions are available for verification.</p>}
      {current?.items?.length > 0 && <label>Draft version
        <select value={selected} onChange={event => { setSelected(event.target.value); setMessage('') }}>
          <option value="">Select draft</option>
          {current.items.map(item => <option key={item.test_version_id} value={item.test_version_id}>
            {item.title} · v{item.version_number} · {item.approval ? 'Source verified' : item.ready_for_verification ? 'Ready for verification' : 'Awaiting version approval'}
          </option>)}
        </select>
      </label>}
      {candidate && <PaperApprovalForm key={candidate.test_version_id} candidate={candidate} canApprove={canApprove} onApprove={rememberApproval} onPublish={published} />}
    </section>
  )
}

function PaperApprovalForm({ candidate, canApprove, onApprove, onPublish }) {
  const existing = candidate.approval
  const [year, setYear] = useState(existing?.paper.year ?? '')
  const [title, setTitle] = useState(existing?.paper.original_title ?? candidate.title)
  const [source, setSource] = useState(existing?.paper.source_citation ?? '')
  const [sourceUrl, setSourceUrl] = useState(existing?.paper.source_url ?? '')
  const [verified, setVerified] = useState(Boolean(existing))
  const [sections, setSections] = useState(() => existing?.sections.map(section => ({
    code: section.code,
    minutes: section.duration_seconds ? String(section.duration_seconds / 60) : '',
    groups: section.marking_groups?.length ? section.marking_groups : [{
      title: section.code, question_count: section.question_count, marks: section.marks, negative_marks: section.negative_marks,
    }],
  })) ?? [blankSection()])
  const [approved, setApproved] = useState(Boolean(existing))
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const canEdit = canApprove && candidate.ready_for_verification

  function edit() {
    setApproved(false)
    setMessage('')
  }

  function changeSection(index, changes) {
    edit()
    setSections(items => items.map((section, i) => i === index ? { ...section, ...changes } : section))
  }

  async function approve(event) {
    event.preventDefault()
    setError('')
    edit()
    if (!source.trim() && !sourceUrl.trim()) {
      setError('Enter a source citation or URL.')
      return
    }
    setBusy(true)
    try {
      const body = {
        paper: {
          examination_code: candidate.examination_code, year: Number(year), original_title: title,
          duration_seconds: candidate.duration_seconds, source_citation: source.trim() || null, source_url: sourceUrl.trim() || null,
          source_verification: 'verified', answer_key_verification: 'verified', state: 'draft',
        },
        sections: sections.map(section => ({
          code: section.code,
          question_count: section.groups.reduce((count, group) => count + Number(group.question_count), 0),
          duration_seconds: section.minutes ? Math.round(Number(section.minutes) * 60) : null,
          marking_groups: section.groups,
        })),
      }
      const result = await backendRequest(`admin/pyq/versions/${candidate.test_version_id}/approve`, { method: 'POST', body })
      setApproved(true)
      onApprove(body)
      setMessage(`Approved ${result.question_count} questions. The paper is ready for publication.`)
    } catch (reason) {
      setError(reason.message)
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    setBusy(true)
    setError('')
    try {
      await backendRequest(`admin/tests/${candidate.test_id}/versions/${candidate.test_version_id}/publish`, { method: 'POST' })
      onPublish()
    } catch (reason) {
      const messages = {
        pyq_approval_stale: 'This version changed after source verification. Validate and approve the paper again.',
        approval_required: 'Complete version approval in Test authoring before publishing.',
      }
      setError(messages[reason.code] ?? reason.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-form" onChange={edit} onSubmit={approve} aria-busy={busy}>
      {error && <p role="alert" className="admin-error">{error}</p>}
      {message && <p role="status">{message}</p>}
      <p>{candidate.examination_code} · {candidate.duration_seconds / 60} minutes</p>
      {!candidate.ready_for_verification && <p>Approve this draft in Test authoring, then refresh draft papers.</p>}
      {!canApprove && <p>An administrator can verify and publish this paper.</p>}
      <fieldset disabled={busy || !canEdit}>
        <legend>Paper details</legend>
        <label>Paper year<input required type="number" min="1900" max="2200" value={year} onChange={event => setYear(event.target.value)} /></label>
        <label>Original paper title<input required maxLength={240} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>Source citation<textarea maxLength={1000} value={source} onChange={event => setSource(event.target.value)} /></label>
        <label>Source URL<input type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label>
        <fieldset>
          <legend>Sections in original paper order</legend>
          {sections.map((section, index) => <div key={index} className="content-block">
            <label>Section code<input required value={section.code} onChange={event => changeSection(index, { code: event.target.value })} /></label>
            <label>Section time limit (minutes)<input type="number" min="0.016" step="any" value={section.minutes} onChange={event => changeSection(index, { minutes: event.target.value })} /></label>
            <fieldset><legend>Marking groups in question order</legend>
              {section.groups.map((group, groupIndex) => <div key={groupIndex} className="content-block">
                {[['title', 'Group title'], ['question_count', 'Question count'], ['marks', 'Marks'], ['negative_marks', 'Negative marks']].map(([key, label]) => (
                  <label key={key}>{label}<input required type={key === 'title' ? 'text' : 'number'} min={{ question_count: 1, marks: '0.001', negative_marks: 0 }[key]}
                    step={['marks', 'negative_marks'].includes(key) ? '0.001' : '1'} value={group[key]} onChange={event => {
                      const value = event.target.value
                      changeSection(index, { groups: section.groups.map((item, i) => i === groupIndex ? { ...item, [key]: value } : item) })
                    }} /></label>
                ))}
                <button type="button" disabled={section.groups.length === 1} onClick={() => changeSection(index, { groups: section.groups.filter((_, i) => i !== groupIndex) })}>Remove marking group</button>
              </div>)}
              <button type="button" onClick={() => changeSection(index, { groups: [...section.groups, blankGroup()] })}>Add marking group</button>
            </fieldset>
            <button type="button" disabled={sections.length === 1} onClick={() => {
              edit()
              setSections(items => items.filter((_, i) => i !== index))
            }}>Remove section</button>
          </div>)}
          <button type="button" onClick={() => { edit(); setSections(items => [...items, blankSection()]) }}>Add section</button>
        </fieldset>
        <label><input type="checkbox" required checked={verified} onChange={event => setVerified(event.target.checked)} />
          I verified the original paper, answer key, question order, duration and marking scheme against the cited source.
        </label>
        <button type="submit">Validate and approve paper</button>
        {approved && <button type="button" onClick={publish}>Publish PYQ test</button>}
      </fieldset>
    </form>
  )
}
