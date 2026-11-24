// Local-only routing checks; no real credentials or provider/API calls.
import assert from 'node:assert/strict'
import React, { act } from 'react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://auth.test/' })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'MouseEvent', 'MutationObserver']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
window.scrollTo = () => {}
const { createRoot } = await import('react-dom/client')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let pendingAuthRequest
const signInWithPassword = async () => {
  await pendingAuthRequest?.promise
  globalThis.__fixtureSignedIn?.()
  return { error: null }
}
globalThis.__authReturnFixture = {
  auth: {
    signInWithPassword,
    async signUp() {
      await signInWithPassword()
      return { data: { session: { user: { id: 'synthetic-user' } } }, error: null }
    },
  },
}
const testsPageModule = Promise.withResolvers()
globalThis.__authReturnFixture.testsPageReady = testsPageModule.promise
const server = await createServer({ configFile: false, envDir: false,
  cacheDir: 'node_modules/.vite-auth-return-check', resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [{ name: 'synthetic-password-auth', enforce: 'pre',
    resolveId(source, importer) {
      if (source.endsWith('/lib/supabase') || source === './supabase.js') return '\0auth-fixture'
      if (importer?.endsWith('/TestCatalog.jsx') && source === '../lib/testsApi') return '\0test-catalog-fixture'
      if (importer?.endsWith('/PYQTests.jsx') && source === '../../lib/backendApi') return '\0pyq-catalog-fixture'
    },
    load(id) {
      if (id === '\0auth-fixture') return `
        export const supabase = {
          auth: {
            ...globalThis.__authReturnFixture.auth,
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          },
        }
        export const isSupabaseConfigured = true
        export const getSupabaseConfigError = () => new Error('Fixture')
      `
      if (id === '\0test-catalog-fixture') return `
        export const listTests = async () => ({ items: [{
          id: 'practice-fixture', title: 'Public practice fixture', kind: 'custom', examination_code: 'NIMCET',
          attempt_limit: 1, attempts_used: 0, duration_seconds: 60, question_count: 1,
        }], page: 1, page_size: 12, has_more: false })
        export const getAttempt = () => { throw new Error('Unexpected anonymous resume') }
        export const startTest = () => { throw new Error('Unexpected anonymous start') }
      `
      if (id === '\0pyq-catalog-fixture') return `
        export const backendGet = async () => ({items: [{
          test_version_id: 'pyq-fixture', title: 'Public PYQ fixture', examination_code: 'NIMCET',
          year: 2026, attempt_limit: 1, attempts_used: 0, duration_seconds: 60,
          metadata: { paper: {}, sections: [{ code: 'MATH', question_count: 1, marks: 4, negative_marks: 1 }] },
        }], page: 1, has_more: false})
        export const backendRequest = () => { throw new Error('Unexpected anonymous PYQ start') }
      `
    },
    transform(code, id) {
      if (id.endsWith('/src/pages/TestCatalog.jsx')) {
        return `await globalThis.__authReturnFixture.testsPageReady;\n${code}`
      }
    },
  }, react()], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
let root
function Probe() {
  const location = useLocation()
  return React.createElement('output', { id: 'path' }, location.pathname + location.search + location.hash)
}
const click = async element => {
  assert.ok(element, 'Expected a rendered login control')
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
}
async function submitAuthForm(fields) {
  for (const [id, value] of fields) {
    const input = document.getElementById(id)
    assert.ok(input, `Expected auth form input ${id}`)
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  await click(document.querySelector('form button[type="submit"]'))
}
const submitLogin = () => submitAuthForm([['login-email', 'fixture@example.test'], ['login-password', 'synthetic']])
async function checkPendingSubmit(submit, message) {
  pendingAuthRequest = Promise.withResolvers()
  try {
    await submit()
    const button = document.querySelector('form button[type="submit"]')
    assert.equal(button?.disabled, true)
    assert.equal(button.textContent.trim(), message)
    assert.ok(button.querySelector('svg[aria-hidden="true"]'))
    assert.ok(Array.from(document.querySelectorAll('form [role="status"]')).some(status => status.textContent === message))
  } finally {
    const request = pendingAuthRequest
    pendingAuthRequest = undefined
    await act(async () => request.resolve())
  }
}
try {
  const { AuthContext } = await server.ssrLoadModule('/src/context/auth-context.js')
  function FixtureSession({ initial, children }) {
    const [auth, setAuth] = React.useState(initial)
    React.useEffect(() => {
      globalThis.__fixtureSignedIn = () => setAuth({ user: { id: 'synthetic-user' }, loading: false })
      return () => { delete globalThis.__fixtureSignedIn }
    }, [])
    return React.createElement(AuthContext.Provider, { value: auth }, children)
  }
  const { default: Navbar } = await server.ssrLoadModule('/src/components/Navbar.jsx')
  const { default: Footer } = await server.ssrLoadModule('/src/components/Footer.jsx')
  const { default: Login } = await server.ssrLoadModule('/src/pages/Login.jsx')
  const { default: Signup } = await server.ssrLoadModule('/src/pages/Signup.jsx')
  const { default: OAuthReturn } = await server.ssrLoadModule('/src/components/OAuthReturn.jsx')
  const { RequireSession } = await server.ssrLoadModule('/src/components/RouteAccess.jsx')
  const { rememberOAuthReturn } = await server.ssrLoadModule('/src/lib/authReturn.js')
  const publicPage = React.createElement(React.Fragment, null, React.createElement(Navbar), React.createElement(Footer))
  async function mount(path, auth = { user: null, loading: false }) {
    if (root) await act(async () => root.unmount())
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(FixtureSession, { initial: auth }, React.createElement(OAuthReturn), React.createElement(Probe),
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/login', element: React.createElement(Login) }),
          React.createElement(Route, { path: '/signup', element: React.createElement(Signup) }),
          React.createElement(Route, { path: '/attempts/:attemptId', element: React.createElement(RequireSession, null, React.createElement('p', null, 'Protected attempt')) }),
          React.createElement(Route, { path: '*', element: publicPage }))))))
  }
  for (const [path, formSelector] of [['/login', '#login-email'], ['/signup', '#signup-email']]) {
    await mount(path)
    assert.ok(document.querySelector(formSelector), 'Signed-out students can open the form')
    await mount(path, { user: null, loading: true })
    assert.ok(document.querySelector('[role="status"]').textContent.includes('Checking your sign-in'))
    assert.equal(document.querySelector(formSelector), null)
    await mount(`${path}?next=%2Ftests`, { user: { id: 'synthetic-user' }, loading: false })
    assert.equal(document.getElementById('path').textContent, '/', 'An existing session redirects home')
    assert.equal(document.querySelector(formSelector), null)
  }
  for (const origin of ['/', '/questions?subject=Mathematics#filters', '/questions/7?answer=show#solution']) {
    await mount(origin)
    const headerLogin = document.querySelector('header a[href^="/login"]')
    assert.equal(new URL(headerLogin.href).searchParams.get('next'), origin)
    await click(headerLogin)
    await submitLogin()
    assert.equal(document.getElementById('path').textContent, origin, 'Password login must return to its exact starting URL')
  }
  await mount('/attempts/example#instructions')
  assert.equal(document.getElementById('path').textContent, '/login')
  await checkPendingSubmit(submitLogin, 'Logging in…')
  assert.equal(document.getElementById('path').textContent, '/attempts/example#instructions')
  await mount('/signup?next=%2Ftests%23instructions')
  await checkPendingSubmit(() => submitAuthForm([
    ['signup-fullName', 'Fixture Student'],
    ['signup-email', 'fixture@example.test'],
    ['signup-password', 'synthetic'],
    ['signup-confirmPassword', 'synthetic'],
  ]), 'Creating account…')
  assert.equal(document.getElementById('path').textContent, '/tests#instructions', 'Signup with an immediate session must keep its return path')
  for (const destination of ['/', '/questions?subject=Mathematics#filters', '/questions/7?answer=show#solution', '/tests#instructions']) {
    rememberOAuthReturn(destination)
    await mount('/questions', { user: { id: 'synthetic-user' }, loading: false })
    assert.equal(document.getElementById('path').textContent, destination, 'OAuth callback must restore the starting URL')
    assert.equal(window.sessionStorage.getItem('nimcet.oauth.return'), null)
  }
  rememberOAuthReturn('/results')
  await mount('/questions', { user: null, loading: true })
  assert.equal(document.getElementById('path').textContent, '/questions')
  assert.notEqual(window.sessionStorage.getItem('nimcet.oauth.return'), null, 'Wait for confirmed authentication')
  const { default: App } = await server.ssrLoadModule('/src/App.jsx')
  async function waitFor(selector) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const element = document.querySelector(selector)
      if (element) return element
      await act(async () => new Promise(resolve => setTimeout(resolve, 25)))
    }
    assert.fail(`Expected ${selector} in the application`)
  }
  await act(async () => root.unmount())
  window.history.replaceState({}, '', '/about')
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(App)))
  await click(await waitFor('header nav a[href="/tests"]'))
  assert.equal(window.location.pathname, '/tests')
  assert.equal(document.querySelector('[role="status"]')?.textContent, 'Loading page…',
    'A slow route must show loading feedback before its module is ready')
  await act(async () => testsPageModule.resolve())
  await waitFor('header nav a[href="/tests"][aria-current="page"]')
  assert.ok(!Array.from(document.querySelectorAll('[role="status"]')).some(status => status.textContent === 'Loading page…'))

  for (const [path, prompt] of [
    ['/tests?source=review#instructions', 'Public practice fixture'],
    ['/pyq?view=tests#instructions', 'Public PYQ fixture'],
    ['/results?source=review#history', 'Sign in to view your results'],
  ]) {
    await act(async () => root.unmount())
    window.history.replaceState({}, '', path)
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(App)))
    const signIn = await waitFor('main a[href^="/login"]')
    assert.equal(window.location.pathname + window.location.search + window.location.hash, path)
    assert.ok(document.querySelector('main').textContent.includes(prompt))
    assert.equal(new URL(signIn.href).searchParams.get('next'), path)
    await click(signIn)
    await waitFor('#login-email')
    assert.equal(window.location.pathname, '/login')
  }
  for (const path of ['/attempts/example', '/attempts/example/result']) {
    await act(async () => root.unmount())
    window.history.replaceState({}, '', path)
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(App)))
    await waitFor('#login-email')
    assert.equal(window.location.pathname, '/login', `${path} must still require authentication`)
  }
  console.log('Auth checks passed: route and submit loading states, signed-out prompts, protected attempts, and sign-in return paths.')
} finally {
  testsPageModule.resolve()
  if (root) await act(async () => root.unmount())
  await server.close()
  dom.window.close()
  delete globalThis.__authReturnFixture
}
