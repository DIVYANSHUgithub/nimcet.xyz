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
globalThis.__authReturnFixture = { auth: { signInWithPassword: async () => {
  globalThis.__fixtureSignedIn?.()
  return { error: null }
} } }
const server = await createServer({ configFile: false, envDir: false,
  cacheDir: 'node_modules/.vite-auth-return-check', resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [{ name: 'synthetic-password-auth', enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('/lib/supabase') || source === './supabase.js') return '\0auth-fixture'
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
    },
  }, react()], server: { middlewareMode: true, hmr: false }, appType: 'custom' })
let root
function Probe() {
  const location = useLocation()
  return React.createElement('output', { id: 'path' }, location.pathname + location.search + location.hash)
}
const click = async element => {
  assert.ok(element, 'Expected a rendered login control')
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
}
async function submitLogin() {
  for (const [id, value] of [['login-email', 'fixture@example.test'], ['login-password', 'synthetic']]) {
    const input = document.getElementById(id)
    assert.ok(input, `Expected real login input ${id}`)
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  await click(document.querySelector('form button[type="submit"]'))
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
          React.createElement(Route, { path: '/attempts/:attemptId', element: React.createElement(RequireSession, null, React.createElement('p', null, 'Protected attempt')) }),
          React.createElement(Route, { path: '*', element: publicPage }))))))
  }
  for (const origin of ['/', '/questions?subject=Mathematics#filters', '/questions/7?answer=show#solution']) {
    await mount(origin)
    const headerLogin = document.querySelector('header a[href^="/login"]')
    const footerLogin = document.querySelector('footer a[href^="/login"]')
    assert.equal(new URL(headerLogin.href).searchParams.get('next'), origin)
    assert.equal(new URL(footerLogin.href).searchParams.get('next'), origin)
    await click(headerLogin)
    await submitLogin()
    assert.equal(document.getElementById('path').textContent, origin, 'Password login must return to its exact starting URL')
  }
  await mount('/attempts/example#instructions')
  assert.equal(document.getElementById('path').textContent, '/login')
  await submitLogin()
  assert.equal(document.getElementById('path').textContent, '/attempts/example#instructions')
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
  for (const [path, prompt] of [
    ['/tests?source=review#instructions', 'Sign in to browse and take tests'],
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
  console.log('Auth return checks passed: real login form, in-page Tests and Results prompts, protected attempts, and password and OAuth return paths.')
} finally {
  if (root) await act(async () => root.unmount())
  await server.close()
  dom.window.close()
  delete globalThis.__authReturnFixture
}
