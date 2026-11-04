import { useEffect, useState } from 'react'
import { getQuestionFacets } from '../lib/questionsApi'

export function useQuestionFacets() {
  const [facets, setFacets] = useState({ subjects: [], topics: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getQuestionFacets({ signal: controller.signal })
      .then((result) => {
        setFacets(result)
        setError('')
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError' || controller.signal.aborted) return
        console.error('Question facets loading failed:', requestError)
        setError('Unable to load subjects and topics from the question bank.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return { ...facets, loading, error }
}
