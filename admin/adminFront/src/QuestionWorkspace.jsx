import { useEffect, useRef, useState } from 'react'
import { backendGet, backendRequest } from '../../../clientFront/src/lib/backendApi'
import MediaLibrary, { AssetPreview, AdminRichContent } from './MediaLibrary'
import { inlineImageUrl, normalizeOption } from '../../../clientFront/src/utils/normalizeQuestion'

const textBlock = () => ({ type: 'text', text: '' })
const legacyImage = (url, alt = '') => ({ type: 'image', media_id: null, alt, legacyUrl: url })

function editableBlock(block) {
  const url = inlineImageUrl(block)
  return url ? legacyImage(url, block.alt) : block
}

function legacyOptionBlocks(option) {
  const content = normalizeOption(option)
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  if (content.blocks?.length) return content.blocks.map(editableBlock)
  const blocks = content.text ? [{ type: 'text', text: content.text }] : []
  if (content.imageUrl) blocks.push(legacyImage(content.imageUrl))
  return blocks.length ? blocks : [textBlock()]
}
const blank = () => ({ exam: 'NIMCET', exam_year: new Date().getFullYear(), section: '', question_number: 1,
  subject: '', topic: '', subtopic_id: null, difficulty: 'medium', source: '', state: 'draft', expected_revision: 0,
  document: { schema_version: 1, statement: [textBlock()], options: Array.from({ length: 4 }, () => ({ id: crypto.randomUUID(), blocks: [textBlock()] })),
    correct_option_id: '', explanation: [textBlock()], occurrences: [] } })
const levels = ['examinations', 'sections', 'subjects', 'topics', 'subtopics']
const parents = { sections: 'examinations', subjects: 'examinations', topics: 'subjects', subtopics: 'topics' }

async function upload(file) {
  if (!file || file.size > 5242880) throw new Error('Choose an image no larger than 5 MB.')
  return backendRequest('admin/media', { method: 'POST', rawBody: file, contentType: file.type })
}

function Blocks({ label, value, onChange, rememberImage, setUploading }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [picker, setPicker] = useState(null)
  const replace = (index, block) => onChange(value.map((item, i) => i === index ? block : item))
  const attach = (index, block, mediaId) => replace(index, { type: 'image', alt: block.alt, media_id: mediaId })
  return <fieldset><legend>{label}</legend>
    {value.map((block, index) => <div key={index} className="content-block">
      <label>Content type<select value={block.type} onChange={e => replace(index, e.target.value === 'image'
        ? { type: 'image', media_id: null, alt: '' } : { type: e.target.value, text: '' })}>
        <option value="text">Text and inline mathematics</option><option value="latex">LaTeX equation</option><option value="image">Image</option>
      </select></label>
      {block.type === 'image' ? <>
        <label>Image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async e => {
          const file = e.target.files?.[0]
          if (!file) return
          setBusy(true); setUploading(true); setError('')
          try { const media = await upload(file); rememberImage(media.id, file); attach(index, block, media.id) }
          catch (err) { setError(err.message) } finally { setBusy(false); setUploading(false) }
        }} /></label>
        <button type="button" onClick={() => setPicker(index)}>Choose from media library</button>
        {picker === index && <div className="admin-preview-panel"><MediaLibrary onPick={mediaId => { attach(index, block, mediaId); setPicker(null) }} /><button type="button" onClick={() => setPicker(null)}>Close image picker</button></div>}
        <label>Image description<input value={block.alt} onChange={e => replace(index, { ...block, alt: e.target.value })} required /></label>
        {block.legacyUrl && <p>Attach a copy of this linked image to save it in the media library. {/^(https?:)?\/\//i.test(block.legacyUrl) && <a href={block.legacyUrl} target="_blank" rel="noreferrer">Open linked image</a>}</p>}
        {block.media_id && <><small>Image attached</small><AssetPreview id={block.media_id} alt={block.alt || 'Attached image'} /></>}
      </> : <label>{block.type === 'latex' ? 'Equation' : 'Text'}<textarea value={block.text} onChange={e => replace(index, { ...block, text: e.target.value })} required /></label>}
      <button type="button" disabled={busy} onClick={() => onChange(value.filter((_, i) => i !== index))}>Remove block</button>
    </div>)}
    <button type="button" disabled={busy} onClick={() => onChange([...value, textBlock()])}>Add text or equation</button>
    <button type="button" disabled={busy} onClick={() => onChange([...value, { type: 'image', media_id: null, alt: '' }])}>Add image</button>
    {busy && <p role="status">Uploading image…</p>}{error && <p role="alert">{error}</p>}
  </fieldset>
}

export default function QuestionWorkspace({ roles }) {
  const [tab, setTab] = useState('questions')
  const [rows, setRows] = useState([])
  const [catalog, setCatalog] = useState({})
  const [draft, setDraft] = useState(blank)
  const [savedDraft, setSavedDraft] = useState(() => JSON.stringify(draft))
  const [id, setId] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filters,setFilters]=useState({state:'',exam:'',subject:''})
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [images, setImages] = useState({})
  const imageRefs = useRef({})
  function rememberImage(key, file) {
    const url = URL.createObjectURL(file)
    if (imageRefs.current[key]) URL.revokeObjectURL(imageRefs.current[key])
    imageRefs.current[key] = url
    setImages({ ...imageRefs.current })
  }
  const [kind, setKind] = useState('examinations')
  const [catalogId, setCatalogId] = useState('')
  const [entry, setEntry] = useState({ code: '', name: '', parent_id: null, status: 'active' })
  const queryKey = JSON.stringify([page, search, revision, filters])
  const [loadedKey, setLoadedKey] = useState('')
  const [loadError, setLoadError] = useState('')
  const loading = loadedKey === ''
  const updating = loadedKey !== queryKey
  const isDirty = JSON.stringify(draft) !== savedDraft
  const canPublish = roles.some(r => ['administrator', 'super_administrator'].includes(r))
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([backendGet('admin/questions', { params: { page, search, ...filters }, signal: controller.signal }),
      ...levels.map(level => backendGet(`admin/catalog/${level}`, { signal: controller.signal }))])
      .then(([questions, ...values]) => { if (controller.signal.aborted) return; setLoadedKey(queryKey); setLoadError(''); setRows(questions); setCatalog(Object.fromEntries(levels.map((level, i) => [level, values[i]]))) })
      .catch(err => { if (!controller.signal.aborted) { setLoadedKey(queryKey); setLoadError(err.message) } })
    return () => controller.abort()
  }, [page, search, revision, queryKey, filters])
  useEffect(() => () => Object.values(imageRefs.current).forEach(url => URL.revokeObjectURL(url)), [])
  function field(name, value) { setDraft(d => ({ ...d, [name]: value })) }
  function document(name, value) { setDraft(d => ({ ...d, document: { ...d.document, [name]: value } })) }
  async function action(operation) {
    setBusy(true); setError(''); setMessage('')
    try { await operation() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  useEffect(() => {
    if (!isDirty) return undefined
    const protect = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [isDirty])
  async function edit(questionId) {
    if (isDirty && !window.confirm('Discard unsaved question changes?')) return
    await action(async () => {
      const row = await backendGet(`admin/questions/${questionId}`)
      const next = blank()
      for (const key of ['exam', 'exam_year', 'section', 'question_number', 'subject', 'topic', 'difficulty', 'source', 'subtopic_id']) {
        if (row[key] != null) next[key] = row[key]
      }
      next.state = row.content_document ? row.editorial_state : row.status
      next.expected_revision = row.revision
      if (row.content_document) next.document = row.content_document
      else {
        next.document.statement = row.statement_blocks?.length
          ? row.statement_blocks.map(editableBlock)
          : [{ type: 'text', text: row.question }]
        next.document.options = row.options.map(option => ({
          id: typeof option?.id === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(option.id) ? option.id : crypto.randomUUID(),
          blocks: legacyOptionBlocks(option),
        }))
        next.document.correct_option_id = next.document.options[row.correct_option]?.id ?? ''
        next.document.explanation = [{ type: 'text', text: row.explanation ?? '' }]
      }
      setDraft(next); setSavedDraft(JSON.stringify(next)); setId(questionId); setPreview(false)
      const mediaIds = [...new Set([next.document.statement, next.document.explanation, ...next.document.options.map(o => o.blocks)].flat().filter(b => b.type === 'image' && b.media_id).map(b => b.media_id))]
      const previews = await Promise.allSettled(mediaIds.map(async mediaId => {
        const image = await backendRequest(`admin/media/${mediaId}`, { responseType: 'blob' })
        rememberImage(mediaId, image)
      }))
      if (previews.some(result => result.status === 'rejected')) setMessage('Some image previews could not load. The saved question is still available to edit.')
    })
  }
  return <section className="question-workspace" aria-busy={updating} aria-label="Question and catalog management">
    <h2>Question bank and media</h2>
    <nav aria-label="Editorial tools"><button type="button" disabled={uploading} onClick={() => setTab('questions')}>Questions</button> <button type="button" disabled={uploading} onClick={() => setTab('catalog')}>Catalog</button></nav>
    {error && <p className="admin-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {loading ? <p role="status">Loading question and catalog records…</p> : loadError ? <div role="alert"><p className="admin-error">{loadError}</p><button type="button" onClick={() => setRevision(r => r + 1)}>Retry loading</button></div> : tab === 'catalog' ? <form className="admin-form" onSubmit={e => { e.preventDefault(); action(async () => {
      await backendRequest(`admin/catalog/${kind}${catalogId ? `/${catalogId}` : ''}`, { method: catalogId ? 'PUT' : 'POST', body: entry })
      setMessage('Catalog saved.'); setRevision(r => r + 1)
    }) }}><fieldset disabled={busy} className="editor-fields">
      <label>Level<select value={kind} onChange={e => { setKind(e.target.value); setCatalogId(''); setEntry({ code: '', name: '', parent_id: null, status: 'active' }) }}>{levels.map(level => <option key={level}>{level}</option>)}</select></label>
      <label>Record<select value={catalogId} onChange={e => {
        setCatalogId(e.target.value)
        const row = catalog[kind]?.find(item => item.id === e.target.value)
        setEntry(row ? { code: row.code, name: row.name, parent_id: row.parent_id, status: row.status } : { code: '', name: '', parent_id: null, status: 'active' })
      }}><option value="">Create new</option>{catalog[kind]?.map(row => <option key={row.id} value={row.id}>{row.name} ({row.editorial_state ?? row.status})</option>)}</select></label>
      {parents[kind] && <label>Parent<select required value={entry.parent_id ?? ''} disabled={Boolean(catalogId)} onChange={e => setEntry({ ...entry, parent_id: e.target.value })}><option value="">Choose parent</option>{catalog[parents[kind]]?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
      <label>Code<input required value={entry.code} onChange={e => setEntry({ ...entry, code: e.target.value })} /></label>
      <label>Name<input required value={entry.name} onChange={e => setEntry({ ...entry, name: e.target.value })} /></label>
      <label>Status<select value={entry.status} onChange={e => setEntry({ ...entry, status: e.target.value })}><option>active</option><option>inactive</option></select></label>
      <button disabled={busy}>Save catalog record</button>
    </fieldset></form> : <>
      <label>Find questions<input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></label>
      <div className="admin-filter-row"><label>Editorial state<select value={filters.state} onChange={e=>{setFilters({...filters,state:e.target.value});setPage(1)}}><option value="">All states</option>{['draft','review','published','archived'].map(state=><option key={state}>{state}</option>)}</select></label>{['exam','subject'].map(key=><label key={key}>{key}<input value={filters[key]} onChange={e=>{setFilters({...filters,[key]:e.target.value});setPage(1)}}/></label>)}</div>
      <ul>{rows.map(row => <li key={row.id}><button type="button" disabled={busy || uploading} onClick={() => edit(row.id)}>#{row.id} — {row.question.slice(0, 90)} ({row.editorial_state ?? row.status})</button></li>)}</ul>
      <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous page</button> <button type="button" disabled={rows.length < 30} onClick={() => setPage(p => p + 1)}>Next page</button>
      <button type="button" disabled={busy || uploading} onClick={() => { if (isDirty && !window.confirm('Discard unsaved question changes?')) return; const next = blank(); setId(null); setDraft(next); setSavedDraft(JSON.stringify(next)); setMessage(''); setPreview(false) }}>New question</button>
      <form className="admin-form" onSubmit={e => { e.preventDefault(); if (uploading) return; action(async () => {
        const groups = [draft.document.statement, draft.document.explanation, ...draft.document.options.map(option => option.blocks)]
        if (groups.flat().some(block => block.type === 'image' && !block.media_id)) {
          throw new Error('Upload or choose an image for each image block before saving.')
        }
        const result = await backendRequest(`admin/questions${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: draft })
        setId(result.id); field('expected_revision', result.revision); setSavedDraft(JSON.stringify({ ...draft, expected_revision: result.revision })); setRevision(r => r + 1); setMessage('Question saved.')
      }) }}><fieldset disabled={busy || uploading} className="editor-fields">
        <h3>{id ? `Edit question #${id}` : 'New question'}</h3>
        {['exam', 'section', 'subject', 'topic', 'source'].map(key => <label key={key}>{key}<input required={key !== 'source'} value={draft[key]} onChange={e => field(key, e.target.value)} /></label>)}
        <label>Year<input type="number" min="1900" max="2200" required value={draft.exam_year} onChange={e => field('exam_year', Number(e.target.value))} /></label>
        <label>Question number<input type="number" min="1" required value={draft.question_number} onChange={e => field('question_number', Number(e.target.value))} /></label>
        <label>Catalog subtopic<select value={draft.subtopic_id ?? ''} onChange={e => {
          const sub = catalog.subtopics?.find(s => s.id === e.target.value)
          const topic = catalog.topics?.find(t => t.id === sub?.parent_id)
          const subject = catalog.subjects?.find(s => s.id === topic?.parent_id)
          const exam = catalog.examinations?.find(x => x.id === subject?.parent_id)
          setDraft(d => ({ ...d, subtopic_id: sub?.id ?? null, ...(topic && subject && exam ? { topic: topic.name, subject: subject.name, exam: exam.code } : {}) }))
        }}><option value="">Choose subtopic</option>{catalog.subtopics?.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Difficulty<select value={draft.difficulty} onChange={e => field('difficulty', e.target.value)}>{['easy', 'medium', 'hard'].map(d => <option key={d}>{d}</option>)}</select></label>
        <Blocks label="Question" value={draft.document.statement} onChange={value => document('statement', value)} rememberImage={rememberImage} setUploading={setUploading} />
        {draft.document.options.map((option, index) => <div key={option.id}>
          <label><input type="radio" name="correct" required checked={draft.document.correct_option_id === option.id} onChange={() => document('correct_option_id', option.id)} />Option {String.fromCharCode(65 + index)} is correct</label>
          <button type="button" disabled={index === 0} onClick={() => {
            const options = [...draft.document.options]
            ;[options[index - 1], options[index]] = [options[index], options[index - 1]]
            document('options', options)
          }}>Move option up</button>
          <Blocks label={`Option ${String.fromCharCode(65 + index)}`} value={option.blocks} onChange={blocks => document('options', draft.document.options.map(o => o.id === option.id ? { ...o, blocks } : o))} rememberImage={rememberImage} setUploading={setUploading} />
        </div>)}
        <Blocks label="Explanation" value={draft.document.explanation} onChange={value => document('explanation', value)} rememberImage={rememberImage} setUploading={setUploading} />
        <fieldset><legend>PYQ occurrences</legend>{draft.document.occurrences.map((occurrence, index) => <div key={index}>
          {['exam', 'year', 'section', 'position', 'source'].map(key => <label key={key}>{key}<input required type={['year', 'position'].includes(key) ? 'number' : 'text'} value={occurrence[key]} onChange={e => document('occurrences', draft.document.occurrences.map((o, i) => i === index ? { ...o, [key]: ['year', 'position'].includes(key) ? Number(e.target.value) : e.target.value } : o))} /></label>)}
          <button type="button" onClick={() => document('occurrences', draft.document.occurrences.filter((_, i) => i !== index))}>Remove occurrence</button>
        </div>)}<button type="button" onClick={() => document('occurrences', [...draft.document.occurrences, { exam: draft.exam, year: draft.exam_year, section: draft.section, position: draft.question_number, source: '' }])}>Add occurrence</button></fieldset>
        <label>State<select value={draft.state} onChange={e => field('state', e.target.value)}>{['draft', 'review', ...(canPublish ? ['published'] : []), 'archived'].map(state => <option key={state}>{state}</option>)}</select></label>
        <button type="button" onClick={() => setPreview(p => !p)}>{preview ? 'Hide preview' : 'Preview'}</button>
        <button disabled={busy}>{busy ? 'Saving…' : 'Save question'}</button>
        {preview && <article><h3>Question preview</h3><AdminRichContent blocks={draft.document.statement} imageUrls={images} />{draft.document.options.map((o, i) => <div key={o.id}><strong>{String.fromCharCode(65 + i)}</strong><AdminRichContent blocks={o.blocks} imageUrls={images} /></div>)}<h4>Explanation</h4><AdminRichContent blocks={draft.document.explanation} imageUrls={images} /></article>}
      </fieldset></form>
    </>}
  </section>
}
