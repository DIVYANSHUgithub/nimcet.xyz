import { useEffect, useState } from 'react'
import { backendGet, backendRequest } from '../../../clientFront/src/lib/backendApi'

export default function PYQApproval({ roles }) {
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [exam, setExam] = useState('NIMCET')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [verified, setVerified] = useState(false)
  const [sections, setSections] = useState([{ code: '', question_count: 1, marks: '4', negative_marks: '1' }])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [approved, setApproved] = useState('')
  const [revision, setRevision] = useState(0)
  const [loadedRevision, setLoadedRevision] = useState(-1)
  const canApprove = roles.some(r => ['administrator', 'super_administrator'].includes(r))
  useEffect(() => {
    const controller = new AbortController()
    backendGet('admin/pyq/candidates', { signal: controller.signal }).then(data => { if (!controller.signal.aborted) { setCandidates(data); setError(''); setLoadedRevision(revision) } })
      .catch(err => { if (!controller.signal.aborted) { setError(err.message); setLoadedRevision(revision) } })
    return () => controller.abort()
  }, [revision])
  const candidate = candidates.find(c => c.test_version_id === selected)
  return <section className="question-workspace" aria-label="PYQ paper approval">
    <h2>Year-wise PYQ paper verification</h2>
    <p>Prepare a PYQ test draft with its original sections and question order. Verify its source and marking scheme before approval. Publication rechecks the complete blueprint.</p>
    {error && <p role="alert" className="admin-error">{error}</p>}{message && <p role="status">{message}</p>}
    <button type="button" onClick={() => { setError(''); setRevision(r => r + 1) }}>Refresh draft papers</button>
    {loadedRevision !== revision ? <p role="status">Loading draft papers…</p> : error && candidates.length === 0 ? null : candidates.length === 0 ? <p>No draft PYQ versions are available for verification.</p> : <form className="admin-form" onChange={() => setApproved('')} onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(''); setApproved('')
      try {
        const payload = { paper: { examination_code: exam, year: Number(year), original_title: title,
          duration_seconds: candidate.duration_seconds, source_citation: source,
          source_verification: verified ? 'verified' : 'unverified', answer_key_verification: verified ? 'verified' : 'unverified', state: 'draft' }, sections }
        const result = await backendRequest(`admin/pyq/versions/${selected}/approve`, { method: 'POST', body: payload })
        setApproved(selected); setMessage(`Approved ${result.question_count} mapped questions. The paper is ready for publication.`)
      } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}>
      <label>Draft version<select required value={selected} onChange={e => { const item = candidates.find(c => c.test_version_id === e.target.value); setSelected(e.target.value); setTitle(item?.title ?? ''); setApproved('') }}><option value="">Select draft</option>{candidates.map(c => <option key={c.test_version_id} value={c.test_version_id}>{c.title} · version {c.version_number} · {c.duration_seconds / 60} minutes</option>)}</select></label>
      <label>Examination code<input required value={exam} onChange={e => setExam(e.target.value)} /></label>
      <label>Paper year<input required type="number" min="1900" max="2200" value={year} onChange={e => setYear(e.target.value)} /></label>
      <label>Original paper title<input required value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label>Source citation<textarea required value={source} onChange={e => setSource(e.target.value)} /></label>
      <fieldset><legend>Original section blueprint, in paper order</legend>{sections.map((section, index) => <div key={index}>
        {['code', 'question_count', 'marks', 'negative_marks'].map(key => <label key={key}>{key.replaceAll('_', ' ')}<input required type={key === 'code' ? 'text' : 'number'} min={key === 'negative_marks' ? '0' : '1'} step={['marks', 'negative_marks'].includes(key) ? '0.001' : '1'} value={section[key]} onChange={e => setSections(current => current.map((s, i) => i === index ? { ...s, [key]: key === 'question_count' ? Number(e.target.value) : e.target.value } : s))} /></label>)}
        <button type="button" disabled={sections.length === 1} onClick={() => setSections(current => current.filter((_, i) => i !== index))}>Remove section</button>
      </div>)}<button type="button" onClick={() => setSections(current => [...current, { code: '', question_count: 1, marks: '4', negative_marks: '1' }])}>Add section</button></fieldset>
      <label><input type="checkbox" required checked={verified} onChange={e => setVerified(e.target.checked)} />I verified the original paper, answer key, duration, section counts, order and marking scheme against the cited source.</label>
      <button disabled={busy || !canApprove || !candidate}>Validate and approve paper</button>
      {!canApprove && <p>An Administrator must approve and publish this paper.</p>}
      {approved === selected && candidate && <button type="button" disabled={busy} onClick={async () => {
        setBusy(true); setError('')
        try {
          await backendRequest(`admin/tests/${candidate.test_id}/versions/${selected}/publish`, { method: 'POST' })
          setMessage('Paper published.'); setApproved(''); setSelected(''); setRevision(r => r + 1)
        } catch (err) { setError(err.message) } finally { setBusy(false) }
      }}>Publish approved paper</button>}
    </form>}
  </section>
}
