import assert from 'node:assert/strict'
import React, { act } from 'react'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://profile.test/profile' })
for (const key of ['window', 'document', 'navigator', 'MutationObserver', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
window.scrollTo = () => {}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = await import('react-dom/client')

const userFixture = {
  id: 'student-1', email: 'student@example.test', created_at: '2026-11-01T00:00:00Z',
  user_metadata: { full_name: 'First Student', username: 'first' }, identities: [{ provider: 'email' }],
}
const date = '2026-11-02T00:00:00Z'
let storedUser = structuredClone(userFixture)
let session = null
let authListener
let updateFails = false
let progressFails = false
let progressReads = 0

function setSession(user, event) {
  session = user ? { user: structuredClone(user), access_token: 'synthetic-token' } : null
  authListener?.(event, session)
}

globalThis.profileAuth = {
  onAuthStateChange(listener) {
    authListener = listener
    return { data: { subscription: { unsubscribe() { authListener = undefined } } } }
  },
  async getSession() { return { data: { session } } },
  async signInWithPassword() { setSession(storedUser, 'SIGNED_IN'); return { error: null } },
  async signOut() { setSession(null, 'SIGNED_OUT'); return { error: null } },
  async updateUser(attributes, options) {
    if (updateFails) return { error: new Error('Synthetic update failure') }
    if (attributes.data) {
      Object.assign(storedUser.user_metadata, attributes.data)
      for (const [key, value] of Object.entries(attributes.data)) {
        if (value === null) delete storedUser.user_metadata[key]
      }
    } else {
      assert.equal(options.emailRedirectTo, 'https://profile.test/login')
      storedUser.new_email = attributes.email
    }
    setSession(storedUser, 'USER_UPDATED')
    return { data: { user: session.user }, error: null }
  },
  async resetPasswordForEmail(email, options) {
    assert.equal(email, userFixture.email)
    assert.equal(options.redirectTo, 'https://profile.test/reset-password')
    return { error: null }
  },
}
globalThis.profileTestsApi = {
  async getMyTestDashboard() {
    assert.ok(session)
    progressReads++
    if (progressFails) throw new Error('Synthetic service failure')
    if (session.user.id !== userFixture.id) return { completed_count: 0, average_percentage: null, best_percentage: null }
    return { completed_count: 2, average_percentage: '62.5', best_percentage: '75' }
  },
  async getMyAttempts({ pageSize }) {
    assert.ok(session)
    assert.equal(pageSize, 4)
    if (session.user.id !== userFixture.id) return { items: [] }
    return { items: [
      { attempt_id: 'active', test_title: 'Practice mock', status: 'in_progress', started_at: date },
      { attempt_id: 'pending', test_title: 'Pending mock', status: 'submitted', submitted_at: date, result_released: false, score: 999 },
      { attempt_id: 'released', test_title: 'Released mock', status: 'submitted', submitted_at: date, result_released: true, score: 75, maximum_score: 100 },
    ] }
  },
}

const server = await createServer({
  configFile: false, envDir: false, cacheDir: 'node_modules/.vite-profile-checks',
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [{
    name: 'isolated-profile-services',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer && /(?:^|\/)supabase(?:\.js)?$/.test(source)) return '\0profile-auth'
      if (importer?.endsWith('/ProfileProgress.jsx') && source === '../lib/testsApi') return '\0profile-tests'
    },
    load(id) {
      if (id === '\0profile-auth') return 'export const supabase = { auth: globalThis.profileAuth }; export const isSupabaseConfigured = true; export const getSupabaseConfigError = () => new Error("Unconfigured");'
      if (id === '\0profile-tests') return 'export const { getMyTestDashboard, getMyAttempts } = globalThis.profileTestsApi;'
    },
  }, react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
})

let root
const button = label => [...document.querySelectorAll('button')].find(element => element.textContent.trim() === label)
const visible = text => document.querySelector('main')?.textContent.includes(text)
const click = async label => {
  const control = button(label)
  assert.ok(control && !control.disabled, `Expected enabled button "${label}"`)
  await act(async () => control.click())
}
const type = async (selector, value) => {
  const input = document.querySelector(selector)
  assert.ok(input, `Missing input ${selector}`)
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function waitUntil(predicate) {
  for (let step = 0; step < 100 && !predicate(); step++) {
    await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
  }
  assert.ok(predicate(), 'Expected the updated page to render')
}

try {
  const { default: App } = await server.ssrLoadModule('/src/App.jsx')
  async function mount() {
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(App)))
  }
  async function unmount() { await act(async () => root.unmount()); root = null }

  await mount()
  await waitUntil(() => locationPathIs('/login') && document.querySelector('input[type="password"]'))
  assert.equal(progressReads, 0)
  await type('input[type="email"]', userFixture.email)
  await type('input[type="password"]', 'synthetic-password')
  await click('Log in')
  await waitUntil(() => locationPathIs('/profile') && visible('62.5%'))
  assert.equal(document.title, 'My profile — NIMCET.XYZ')
  assert.ok(document.querySelector('header a[href="/profile"][aria-current="page"]'))
  assert.ok(document.querySelector('a[href="/attempts/active"]'))
  assert.ok(document.querySelector('a[href="/attempts/released/result"]'))
  assert.ok(visible('Score pending'))
  assert.ok(!visible('999'))

  await type('#profile-name', '  Updated Student  ')
  await type('#profile-username', '')
  updateFails = true
  await click('Save changes')
  assert.ok(visible('Synthetic update failure'))
  assert.equal(storedUser.user_metadata.username, 'first')
  updateFails = false
  await click('Save changes')
  assert.ok(visible('Profile saved.'))
  assert.deepEqual(storedUser.user_metadata, { full_name: 'Updated Student' })
  await type('#profile-name', 'Unsaved Student')
  await click('Cancel')
  assert.equal(document.querySelector('#profile-name').value, 'Updated Student')

  await click('Change email')
  await type('#profile-new-email', 'updated@example.test')
  await click('Send confirmation')
  assert.ok(visible('Pending confirmation for updated@example.test'))
  await click('Send password reset')
  assert.ok(visible('Check your email for the password reset link.'))

  await unmount()
  progressFails = true
  await mount()
  await waitUntil(() => visible('Test progress could not be loaded'))
  assert.equal(document.querySelector('#profile-name').value, 'Updated Student')
  assert.equal(document.querySelector('#profile-username').value, '')
  assert.ok(visible('Pending confirmation for updated@example.test'))
  progressFails = false
  await click('Try again')
  await waitUntil(() => visible('62.5%'))

  await act(async () => setSession({
    ...userFixture, id: 'student-2', identities: [{ provider: 'google' }], user_metadata: { name: 'Social Student' },
  }, 'SIGNED_IN'))
  await waitUntil(() => visible('Social Student'))
  assert.equal(document.querySelector('#profile-name').value, 'Social Student')
  assert.ok(visible('Google'))
  assert.equal(button('Send password reset'), undefined)
  await waitUntil(() => visible('No test attempts yet.'))
  assert.ok(!visible('Released mock'))
  await click('Sign out')
  await waitUntil(() => locationPathIs('/login'))
  assert.ok(!visible('Social Student'))
  console.log('Profile checks passed for authentication, account edits, pending email, recovery, progress, and account changes.')
} finally {
  if (root) await act(async () => root.unmount())
  await server.close()
  dom.window.close()
}

function locationPathIs(path) {
  return window.location.pathname === path
}
