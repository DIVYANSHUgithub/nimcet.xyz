import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Pagination from '../questions/Pagination'
import QuestionList from '../questions/QuestionList'
import { backendGet } from '../../lib/backendApi'
import { QUESTION_PAGE_SIZE } from '../../lib/questionsApi'
import { normalizeQuestion } from '../../utils/normalizeQuestion'

function filterOptions(values) {
  return [...new Set(values.filter(Boolean))].map(value => ({ value, label: value }))
}

function Filter({ label, value, options, onChange }) {
  return (
    <label className="min-w-0 text-sm font-medium text-ink-heading">
      {label}
      <select value={value} onChange={event => onChange(event.target.value)}
        className="mt-1 block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm font-normal text-ink">
        <option value="">All {label.toLowerCase()}s</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

export default function PYQQuestions({ params, updateParams }) {
  const year = params.get('year') || ''
  const subject = params.get('subject') || ''
  const chapter = params.get('chapter') || ''
  const topic = params.get('topic') || ''
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1)
  const [facets, setFacets] = useState(null)
  const [facetsError, setFacetsError] = useState('')
  const [facetsRevision, setFacetsRevision] = useState(0)
  const [response, setResponse] = useState(null)
  const [revision, setRevision] = useState(0)
  const requestKey = JSON.stringify([year, subject, chapter, topic, page, revision])
  const current = response?.key === requestKey ? response : null

  useEffect(() => {
    const controller = new AbortController()
    backendGet('questions/pyq-facets', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setFacets(data) })
      .catch(error => { if (!controller.signal.aborted) setFacetsError(error.message) })
    return () => controller.abort()
  }, [facetsRevision])

  useEffect(() => {
    const controller = new AbortController()
    backendGet('questions', {
      params: { pyq: true, year, subject, chapter, subtopic_id: topic, page, page_size: QUESTION_PAGE_SIZE },
      signal: controller.signal,
    }).then(data => {
      if (!controller.signal.aborted) setResponse({ key: requestKey, data })
    }).catch(error => {
      if (!controller.signal.aborted) setResponse({ key: requestKey, error: error.message })
    })
    return () => controller.abort()
  }, [year, subject, chapter, topic, page, requestKey])

  const taxonomy = facets?.taxonomy ?? []
  const subjectRows = taxonomy.filter(row => !subject || row.subject === subject)
  const chapterRows = subjectRows.filter(row => !chapter || row.chapter === chapter)
  const topics = [...new Map(chapterRows.filter(row => row.topic_id)
    .map(row => [row.topic_id, { value: row.topic_id, label: row.topic }])).values()]
  const data = current?.data
  const first = data ? (data.page - 1) * data.page_size + 1 : 0

  function changeFilters(values) {
    updateParams({ ...values, page: '' })
  }

  return (
    <section aria-labelledby="pyq-questions-heading">
      <h2 id="pyq-questions-heading" className="mb-4 text-xl font-semibold text-ink-heading">All PYQ questions</h2>
      <div className="mb-5 rounded-xl border border-line bg-canvas-muted p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filter label="Year" value={year} options={filterOptions((facets?.years ?? []).map(String))} onChange={value => changeFilters({ year: value })} />
          <Filter label="Subject" value={subject} options={filterOptions(taxonomy.map(row => row.subject))} onChange={value => changeFilters({ subject: value, chapter: '', topic: '' })} />
          <Filter label="Chapter" value={chapter} options={filterOptions(subjectRows.map(row => row.chapter))} onChange={value => changeFilters({ chapter: value, topic: '' })} />
          <Filter label="Topic" value={topic} options={topics} onChange={value => changeFilters({ topic: value })} />
        </div>
        {(year || subject || chapter || topic) && <Button variant="ghost" size="sm" className="mt-3" onClick={() => changeFilters({ year: '', subject: '', chapter: '', topic: '' })}>Clear filters</Button>}
        {facetsError && <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span>Question filters could not be loaded.</span>
          <Button variant="secondary" size="sm" onClick={() => { setFacetsError(''); setFacetsRevision(value => value + 1) }}>Reload filters</Button>
        </div>}
      </div>

      {!current && <p role="status" className="text-sm text-ink-muted">Loading PYQ questions…</p>}
      {current?.error && <div role="alert" className="rounded-xl border border-line bg-surface p-5">
        <p className="mb-3 text-sm">{current.error}</p>
        <Button variant="secondary" onClick={() => setRevision(value => value + 1)}>Try again</Button>
      </div>}
      {data?.total === 0 && <p className="rounded-xl border border-dashed border-line p-6 text-sm text-ink-muted">
        {year || subject || chapter || topic ? 'No PYQ questions match these filters.' : 'No PYQ questions have been published yet.'}
      </p>}
      {data?.total > 0 && <>
        <QuestionList questions={data.items.map(normalizeQuestion)} pageStartIndex={first} returnTo={params.size ? `/pyq?${params}` : '/pyq'} />
        <Pagination page={data.page} totalPages={Math.ceil(data.total / data.page_size)}
          start={first} end={Math.min(data.page * data.page_size, data.total)} totalLabel={String(data.total)}
          onPageChange={value => updateParams({ page: value === 1 ? '' : value })} />
      </>}
    </section>
  )
}
