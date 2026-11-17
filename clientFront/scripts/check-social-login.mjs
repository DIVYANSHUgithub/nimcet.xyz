// Real React component, synthetic OAuth promises and browser restore events.
// Does not contact providers, sign anyone in or navigate away.
import assert from 'node:assert/strict'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://login.test/login' })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const requests = []
globalThis.__socialLoginFixture = {
  auth: { signInWithOAuth(options) {
    return new Promise(resolve => requests.push({ options, resolve }))
  } },
}
const server = await createServer({ configFile: false, envDir: false,
  cacheDir: 'node_modules/.vite-social-login-check', resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [{ name: 'synthetic-oauth', enforce: 'pre',
    resolveId(source, importer) {
      if (importer?.endsWith('/SocialLogin.jsx') && source === '../../lib/supabase') return '\0synthetic-oauth'
    },
    load(id) {
      if (id === '\0synthetic-oauth') return 'export const supabase = globalThis.__socialLoginFixture; export const getSupabaseConfigError = () => new Error("Fixture config error")'
    },
  }, react()], server: { middlewareMode: true, hmr: false }, appType: 'custom' })
let root
const buttons = () => [...document.querySelectorAll('button')]
const click = async index => act(async () => buttons()[index].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })))
try {
  const { default: SocialLogin } = await server.ssrLoadModule('/src/components/auth/SocialLogin.jsx')
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(React.StrictMode, null,
    React.createElement(MemoryRouter, { initialEntries: ['/login?next=%2Fquestions%2F7%3Fanswer%3Dshow%23solution'] }, React.createElement(SocialLogin)))))
  await click(0)
  assert.equal(requests[0].options.provider, 'google')
  assert.equal(JSON.parse(window.sessionStorage.getItem('nimcet.oauth.return')).path, '/questions/7?answer=show#solution')
  assert.ok(buttons().every(button => button.disabled))
  await click(0)
  assert.equal(requests.length, 1, 'Duplicate clicks must not start another request')
  const restore = new Event('pageshow')
  Object.defineProperty(restore, 'persisted', { value: true })
  await act(async () => window.dispatchEvent(restore))
  assert.equal(window.sessionStorage.getItem('nimcet.oauth.return'), null)
  assert.ok(buttons().every(button => !button.disabled), 'Back restoration must unlock both buttons')
  await click(1)
  assert.equal(requests[1].options.provider, 'github')
  await act(async () => requests[0].resolve({ error: new Error('Stale request error') }))
  assert.ok(buttons()[1].textContent.includes('Connecting to GitHub'))
  assert.equal(document.querySelector('[role="alert"]'), null, 'Stale request must not overwrite a retry')
  await act(async () => requests[1].resolve({ error: null }))
  assert.ok(buttons().every(button => !button.disabled), 'A completed request without navigation must unlock buttons')
  await click(0)
  await act(async () => requests[2].resolve({ error: { message: 'Synthetic provider error' } }))
  assert.ok(document.querySelector('[role="alert"]').textContent.includes('Synthetic provider error'))
  assert.ok(buttons().every(button => !button.disabled))
  await click(1)
  await act(async () => requests[3].resolve({ error: null }))
  assert.equal(document.querySelector('[role="alert"]'), null, 'A retry clears the previous error')
  console.log('Social login checks passed: Back restoration, both providers retryable, duplicate prevention, stale-response isolation, completed request and provider error recovery.')
} finally {
  if (root) await act(async () => root.unmount())
  await server.close()
  dom.window.close()
  delete globalThis.__socialLoginFixture
}
