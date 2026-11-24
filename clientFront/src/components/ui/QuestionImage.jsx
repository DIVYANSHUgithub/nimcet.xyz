import { useEffect, useState } from 'react'
import { backendRequest } from '../../lib/backendApi'

export function AttemptImage({ attemptId, mediaId, review, alt }) {
  const [result, setResult] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    let url
    backendRequest(`attempts/${encodeURIComponent(attemptId)}/media/${encodeURIComponent(mediaId)}`, {
      params: review ? { review: true } : undefined,
      responseType: 'blob',
      signal: controller.signal,
    }).then(blob => {
      if (controller.signal.aborted) return
      url = URL.createObjectURL(blob)
      setResult({ url })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ failed: true })
    })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [attemptId, mediaId, review])
  if (!result) return <span role="status" className="block text-sm text-ink-muted">Loading image…</span>
  return <QuestionImage src={result.url} alt={alt} unavailable={result.failed} />
}

export default function QuestionImage({ src, alt, unavailable = false }) {
  const [failed, setFailed] = useState(false)
  return failed || unavailable ? (
    <span className="my-2 block rounded-md border border-line p-2 text-sm text-ink-muted" role="status">
      Image unavailable{alt ? `: ${alt}` : ''}
    </span>
  ) : (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="my-2 block h-auto max-w-full rounded-md object-contain dark:bg-white"
      onError={() => setFailed(true)}
    />
  )
}
