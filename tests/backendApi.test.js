import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiRequestError, createBackendApi } from '../clientFront/src/lib/backendApi.js'

test('backend GET adds filters, forwards the current bearer token, and omits cookies', async () => {
  const controller = new AbortController()
  let request
  const get = createBackendApi({
    baseUrl: 'https://api.example.test/api/v1/',
    getToken: async () => 'signed-access-token',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, status: 200, json: async () => ({ items: [], total: 0 }) }
    },
  })

  const result = await get('questions', {
    params: { page: 2, page_size: 10, subject: 'Analytical Ability & Reasoning', empty: '' },
    signal: controller.signal,
  })

  assert.deepEqual(result, { items: [], total: 0 })
  assert.equal(request.url.origin, 'https://api.example.test')
  assert.equal(request.url.pathname, '/api/v1/questions')
  assert.equal(request.url.searchParams.get('page'), '2')
  assert.equal(request.url.searchParams.get('subject'), 'Analytical Ability & Reasoning')
  assert.equal(request.url.searchParams.has('empty'), false)
  assert.equal(request.options.headers.Authorization, 'Bearer signed-access-token')
  assert.equal(request.options.credentials, 'omit')
  assert.equal(request.options.signal, controller.signal)
})

test('backend GET works anonymously when no Supabase session exists', async () => {
  let requestHeaders
  const get = createBackendApi({
    baseUrl: 'http://localhost:8000/api/v1',
    getToken: async () => null,
    fetchImpl: async (_url, options) => {
      requestHeaders = options.headers
      return { ok: true, status: 200, json: async () => ({ subjects: [], topics: [] }) }
    },
  })

  await get('questions/facets')
  assert.equal(requestHeaders.Authorization, undefined)
  assert.equal(requestHeaders.Accept, 'application/json')
})

test('backend role changes send JSON with bearer auth and never include browser cookies', async () => {
  let request
  const requestApi = createBackendApi({
    baseUrl: 'https://api.example.test/api/v1',
    getToken: async () => 'admin-access-token',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, status: 200, json: async () => ({ role_code: 'editor' }) }
    },
  })
  const path = 'admin/users/515be112-bd15-4e09-9fc9-cfa71ec81238/roles/editor'

  await requestApi(path, { method: 'POST', body: { reason: 'Assign content review duties' } })

  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers.Authorization, 'Bearer admin-access-token')
  assert.equal(request.options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(request.options.body), { reason: 'Assign content review duties' })
  assert.equal(request.options.credentials, 'omit')
})

test('backend API errors preserve safe status and code without exposing response internals', async () => {
  const get = createBackendApi({
    baseUrl: 'https://api.example.test/api/v1',
    getToken: async () => null,
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => ({
        error: { code: 'database_unavailable', message: 'Question service unavailable', secret: 'private-dsn' },
      }),
    }),
  })

  await assert.rejects(
    get('questions'),
    (error) => error instanceof ApiRequestError
      && error.status === 503
      && error.code === 'database_unavailable'
      && !error.message.includes('private-dsn'),
  )
})

test('backend API rejects missing base URL and converts network failures to safe errors', async () => {
  await assert.rejects(
    createBackendApi({ baseUrl: '' })('questions'),
    (error) => error.code === 'api_not_configured',
  )

  const offline = createBackendApi({
    baseUrl: 'https://api.example.test/api/v1',
    getToken: async () => null,
    fetchImpl: async () => { throw new Error('internal network details') },
  })
  await assert.rejects(
    offline('questions'),
    (error) => error.code === 'network_error' && !error.message.includes('internal network details'),
  )

  await assert.rejects(
    createBackendApi({ baseUrl: 'not-a-url' })('questions'),
    (error) => error.code === 'invalid_api_url',
  )
})
