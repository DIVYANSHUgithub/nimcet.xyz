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
} = {}) {
  const apiBaseUrl = String(baseUrl ?? '').trim().replace(/\/+$/, '')

  return async function backendRequest(path, { params = {}, signal, method = 'GET', body } = {}) {
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

    let response
    try {
      response = await fetchImpl(url, {
        method,
        headers,
        signal,
        credentials: 'omit',
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      throw new ApiRequestError('The NIMCET service could not be reached.', { code: 'network_error' })
    }

    let responseBody
    try {
      responseBody = await response.json()
    } catch {
      throw new ApiRequestError('The NIMCET service returned an invalid response.', {
        status: response.status,
        code: 'invalid_response',
      })
    }

    if (!response.ok) {
      const error = responseBody?.error
      throw new ApiRequestError(
        typeof error?.message === 'string' ? error.message : 'The request could not be completed.',
        { status: response.status, code: typeof error?.code === 'string' ? error.code : 'request_failed' },
      )
    }
    return responseBody
  }
}

export const backendRequest = createBackendApi()
export const backendGet = (path, options = {}) => backendRequest(path, { ...options, method: 'GET' })
