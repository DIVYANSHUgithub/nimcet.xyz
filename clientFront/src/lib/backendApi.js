import { supabase } from './supabase.js'

export class ApiRequestError extends Error {
  constructor(message, { status = 0, code = 'request_failed' } = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

async function getAccessToken() {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new ApiRequestError('Your session could not be checked. Please try again.', { code: 'session_unavailable' })
  return data?.session?.access_token ?? null
}

export function createBackendApi({
  baseUrl = import.meta.env?.VITE_API_BASE_URL,
  getToken = getAccessToken,
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = 20000,
} = {}) {
  const apiBaseUrl = String(baseUrl ?? '').trim().replace(/\/+$/, '')

  return async function backendRequest(path, { params = {}, signal, method = 'GET', body, rawBody, contentType, responseType = 'json' } = {}) {
    if (!apiBaseUrl) {
      throw new ApiRequestError('The NIMCET API is not configured for this deployment.', { code: 'api_not_configured' })
    }

    let url
    try {
      url = new URL(`${apiBaseUrl}/${String(path).replace(/^\/+/, '')}`)
    } catch {
      throw new ApiRequestError('The question API URL is invalid.', { code: 'invalid_api_url' })
    }
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }

    const token = await getToken()
    const headers = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (rawBody !== undefined && contentType) headers['Content-Type'] = contentType
    if (rawBody !== undefined && body !== undefined) throw new ApiRequestError('The request body is invalid.', { code: 'invalid_body' })

    const timeoutController = new AbortController()
    const requestSignal = timeoutMs > 0
      ? AbortSignal.any([timeoutController.signal, ...(signal ? [signal] : [])])
      : signal
    const timer = timeoutMs > 0 ? setTimeout(() => timeoutController.abort(), timeoutMs) : null
    try {
      let response
      try {
        response = await fetchImpl(url, {
          method, headers, signal: requestSignal, credentials: 'omit',
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
          ...(rawBody !== undefined ? { body: rawBody } : {}),
        })
      } catch (error) {
        if (signal?.aborted) throw error
        if (timeoutController.signal.aborted) throw new ApiRequestError('The request timed out. Check the current state before retrying.', { status: 504, code: 'request_timeout' })
        if (error?.name === 'AbortError') throw error
        throw new ApiRequestError('The NIMCET service could not be reached.', { code: 'network_error' })
      }
      let responseBody
      try { responseBody = response.ok && responseType === 'blob' ? await response.blob() : await response.json() }
      catch (error) {
        if (signal?.aborted) throw error
        if (timeoutController.signal.aborted) throw new ApiRequestError('The response timed out. Please check again.', { status: 504, code: 'request_timeout' })
        throw new ApiRequestError('The NIMCET service returned an invalid response.', { status: response.status, code: 'invalid_response' })
      }
      if (!response.ok) {
        const error = responseBody?.error
        const featureMessage = { admin_workflows_not_enabled: 'Administrative workflows are awaiting activation.', content_not_enabled: 'Question management is not available yet.', phase5_not_enabled: 'PYQ papers and detailed summaries are not available yet.', storage_not_configured: 'Image uploads are not available yet.' }[error?.code]
        throw new ApiRequestError(featureMessage ?? (typeof error?.message === 'string' ? error.message : 'The request could not be completed.'),
          { status: response.status, code: typeof error?.code === 'string' ? error.code : 'request_failed' })
      }
      return responseBody
    } finally {
      if (timer !== null) clearTimeout(timer)
    }
  }
}

export const backendRequest = createBackendApi()
export const backendGet = (path, options = {}) => backendRequest(path, { ...options, method: 'GET' })
