// Interactive React/DOM verification with synthetic data only. No listener,
// environment files, browser session, credentials or live API calls are used.
import assert from 'node:assert/strict'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://workflow.test/attempts/synthetic-attempt' })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const server = await createServer({ configFile: false, envDir: false,
  cacheDir: 'node_modules/.vite-student-verification',
  plugins: [{ name: 'isolated-attempt-api', enforce: 'pre',
    resolveId(source, importer) {
      if (importer?.endsWith('/TestAttempt.jsx') && source === '../lib/testsApi') return '\0isolated-attempt-api'
    },
    load(id) {
      if (id === '\0isolated-attempt-api') return ['getAttempt', 'saveAnswer', 'saveNavigation', 'submitAttempt']
        .map(name => `export const ${name} = (...args) => globalThis.__workflowApi.${name}(...args)`).join('\n')
    },
  }, react()], resolve: { dedupe: ['react', 'react-dom'] },
  server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
let root
let persisted
let reads = 0
let navFails = false
let answerFails = false
let submitted = false
let deferredSaves = null
let deferredNavigation = null
let answerCalls = 0
let loseAnswerResponse = false
const checks = []
const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) }) }
const report = (name, passed) => { checks.push({ name, passed }); console.log(JSON.stringify(checks.at(-1))) }
const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text)
const option = index => document.querySelectorAll('button[aria-pressed]')[index + 1]
const click = async target => {
  assert.ok(target, 'Expected a rendered control')
  await act(async () => target.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await flush()
}
const savedHeader = () => document.querySelector('header')?.textContent.includes('Autosaved') ?? false
function reset() {
  reads = 0; navFails = false; answerFails = false; submitted = false; deferredSaves = null
  deferredNavigation = null; answerCalls = 0; loseAnswerResponse = false
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  persisted = { attempt_id: 'synthetic-attempt', test_id: 'synthetic-test', test_version_id: 'synthetic-version',
    test_title: 'Synthetic verification', status: 'in_progress', started_at: new Date().toISOString(),
    deadline_at: new Date(Date.now() + 360000).toISOString(), remaining_seconds: 360,
    questions: [0, 1].map(i => ({ attempt_question_id: `q${i}`, question_id: i + 1, section_id: 'math',
      section_title: 'Mathematics', display_order: i, question: `Synthetic question ${i + 1}`,
      options: ['A', 'B', 'C', 'D'].map((content, j) => ({ id: `option-${j}`, content })),
      answer: { selected_option_id: null, version: 0, saved_at: null },
      state: { visited: false, marked_for_review: false } })) }
  globalThis.__workflowApi = {
    async getAttempt() { reads++; return structuredClone({ ...persisted, server_time: new Date().toISOString(),
      remaining_seconds: Math.max(0, Math.floor((Date.parse(persisted.deadline_at) - Date.now()) / 1000)) }) },
    async saveNavigation(_id, payload) {
      if (navFails) throw new Error('Synthetic navigation failure')
      if (deferredNavigation) await new Promise(resolve => deferredNavigation.push(resolve))
      const q = persisted.questions.find(q => q.attempt_question_id === payload.current_attempt_question_id)
      q.state = { visited: true, marked_for_review: payload.marked_for_review }
      return payload
    },
    saveAnswer(_id, questionId, payload) {
      answerCalls++
      const commit = () => {
        const q = persisted.questions.find(q => q.attempt_question_id === questionId)
        if (payload.expected_version !== q.answer.version) throw new Error('Synthetic stale answer version')
        q.answer = { selected_option_id: payload.selected_option_id, version: q.answer.version + 1, saved_at: new Date().toISOString() }
        return { attempt_question_id: questionId, ...q.answer }
      }
      if (answerFails) return Promise.reject(new Error('Synthetic connection failure'))
      if (loseAnswerResponse) {
        commit(); loseAnswerResponse = false
        return Promise.reject(new Error('Synthetic lost response after commit'))
      }
      if (deferredSaves) return new Promise(resolve => deferredSaves.push(() => resolve(commit())))
      return Promise.resolve(commit())
    },
    async submitAttempt() { submitted = true; return { attempt_id: persisted.attempt_id, status: 'submitted', submission_reason: 'student_submitted' } },
  }
}
try {
  const { AuthContext } = await server.ssrLoadModule('/src/context/auth-context.js')
  const { default: Attempt } = await server.ssrLoadModule('/src/pages/TestAttempt.jsx')
  async function mount() {
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(AuthContext.Provider, { value: { user: { id: 'synthetic-student' } } },
      React.createElement(MemoryRouter, { initialEntries: ['/attempts/synthetic-attempt'] },
        React.createElement(Routes, null, React.createElement(Route, { path: '/attempts/:attemptId', element: React.createElement(Attempt) }))))))
    await flush()
  }
  async function unmount() { await act(async () => root.unmount()); root = null }

  reset(); await mount()
  await click(option(1))
  await click(button('Mark for review'))
  const before = Number(document.querySelector('[role="timer"]').textContent.replace(/\D/g, ''))
  await unmount(); await mount()
  // Hydration intentionally opens the first unanswered question. Return to Q1
  // before checking its persisted answer and review flag.
  await click(button('1'))
  report('saved answer and review state survive remount', document.querySelectorAll('button[aria-pressed="true"]').length >= 2
    && document.body.textContent.includes('Marked for review'))
  report('refresh does not reset the countdown', Number(document.querySelector('[role="timer"]').textContent.replace(/\D/g, '')) <= before)
  await unmount()

  reset(); await mount()
  await click(option(0)); await click(option(2))
  report('a saved answer can be changed before submission', persisted.questions[0].answer.selected_option_id === 'option-2'
    && persisted.questions[0].answer.version === 2 && option(2).getAttribute('aria-pressed') === 'true')
  await unmount(); await mount(); await click(button('1'))
  report('the changed answer survives refresh', option(2).getAttribute('aria-pressed') === 'true')
  await click(button('Clear answer'))
  report('a saved answer can be cleared back to unanswered', persisted.questions[0].answer.selected_option_id === null
    && persisted.questions[0].answer.version === 3 && !document.querySelector('[aria-pressed="true"]'))
  await unmount()

  reset(); navFails = true; await mount()
  assert.ok(document.body.textContent.includes('We could not save'))
  report('navigation failure does not claim Autosaved', !savedHeader())
  await unmount()

  reset(); answerFails = true; await mount(); await click(option(1))
  assert.equal(persisted.questions[0].answer.version, 0)
  report('answer failure does not claim Autosaved', !savedHeader())
  const beforeOnline = reads
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  await act(async () => window.dispatchEvent(new Event('offline')))
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  answerFails = false
  await act(async () => window.dispatchEvent(new Event('online'))); await flush()
  report('reconnect reconciles state or retries the unsaved answer', reads > beforeOnline || persisted.questions[0].answer.version > 0)
  report('reconnect preserves and saves the intended selection', persisted.questions[0].answer.selected_option_id === 'option-1' && savedHeader())
  await unmount()

  reset(); answerFails = true; await mount(); await click(option(1))
  await click(button('Sync now'))
  report('repeated failure keeps the local selection and unsaved warning', option(1).getAttribute('aria-pressed') === 'true'
    && !savedHeader() && document.body.textContent.includes('We could not save'))
  await click(button('Submit')); await click(button('Submit attempt'))
  report('manual submission is blocked while edits remain unsaved', !submitted)
  await unmount()

  reset(); loseAnswerResponse = true; await mount(); await click(option(1))
  assert.equal(persisted.questions[0].answer.version, 1)
  assert.ok(!savedHeader())
  await click(button('Sync now'))
  report('lost save response is reconciled without duplicate mutation', answerCalls === 1 && savedHeader())
  await unmount()

  reset(); loseAnswerResponse = true; await mount(); await click(option(0)); await click(option(1))
  assert.equal(persisted.questions[0].answer.selected_option_id, 'option-0')
  await click(button('Sync now'))
  report('recovery rebases a newer local choice on the current server version', persisted.questions[0].answer.selected_option_id === 'option-1'
    && persisted.questions[0].answer.version === 2 && savedHeader())
  await unmount()

  reset(); navFails = true; await mount(); await click(button('Mark for review'))
  navFails = false
  await click(button('2'))
  report('saving another question does not hide an unresolved review failure', !savedHeader())
  await click(button('Sync now'))
  report('sync retries the failed review flag without losing it', persisted.questions[0].state.marked_for_review && savedHeader())
  await unmount()

  reset(); answerFails = true; await mount(); await click(option(1))
  const callsBeforeExpiry = answerCalls
  persisted.status = 'expired'
  await click(button('Sync now'))
  report('an ended attempt is reconciled without retrying answer writes', answerCalls === callsBeforeExpiry
    && document.body.textContent.includes('Time is up') && document.body.textContent.includes('unconfirmed changes'))
  await unmount()

  reset(); deferredSaves = []; await mount(); await click(option(1))
  await act(async () => window.dispatchEvent(new Event('focus'))); await flush()
  const readsBeforeSave = reads
  report('focus recovery waits for in-flight saves before reloading', readsBeforeSave === 1 && !savedHeader())
  await act(async () => deferredSaves[0]()); await flush()
  report('focus recovery preserves the selection and completes after its save', reads > readsBeforeSave
    && persisted.questions[0].answer.selected_option_id === 'option-1' && savedHeader())
  await unmount()

  reset(); deferredNavigation = []; await mount()
  assert.equal(deferredNavigation.length, 1)
  await click(button('Submit')); await click(button('Submit attempt'))
  report('submission also waits for navigation and review writes', !submitted)
  await act(async () => deferredNavigation[0]()); await flush()
  report('submission proceeds once navigation is saved', submitted)
  await unmount()

  reset(); deferredSaves = []; await mount()
  await click(option(0)); await click(option(1))
  assert.equal(deferredSaves.length, 1)
  await act(async () => deferredSaves[0]()); await flush()
  assert.equal(deferredSaves.length, 2)
  report('old acknowledgement does not replace a newer local selection', option(1).getAttribute('aria-pressed') === 'true')
  await click(button('Submit')); await click(button('Submit attempt'))
  report('submission waits for the newest queued answer', !submitted)
  await act(async () => deferredSaves[1]()); await flush()
  report('submission follows the newest saved answer', submitted && persisted.questions[0].answer.selected_option_id === 'option-1')
  await unmount()

  reset()
  const loadTimedFixture = globalThis.__workflowApi.getAttempt
  globalThis.__workflowApi.getAttempt = async () => {
    const data = await loadTimedFixture()
    const number = reads === 1 ? 1 : 2
    const seconds = number === 1 ? 0 : 120
    const title = number === 1 ? 'Mathematics' : 'Reasoning'
    const id = `part-${number}`
    return {
      ...data,
      timed_section: { id, title, number, total: 2, remaining_seconds: seconds,
        deadline_at: new Date(Date.parse(data.server_time) + seconds * 1000).toISOString() },
      questions: [{ ...data.questions[number - 1], section_id: id, section_title: title }],
    }
  }
  await mount()
  report('the first timed section has its own clock and cannot submit the whole test',
    document.querySelector('header').textContent.includes('Section 1 of 2') && !button('Submit'))
  const rolloverTimeout = Date.now() + 3000
  while (reads < 2 && Date.now() < rolloverTimeout) await flush()
  await flush()
  report('section expiry loads the next section without submitting the attempt',
    !submitted && document.querySelector('header').textContent.includes('Section 2 of 2')
    && document.body.textContent.includes('Synthetic question 2') && !document.body.textContent.includes('Synthetic question 1')
    && Boolean(button('Submit')))
  await unmount()

  console.log(JSON.stringify({ mode: 'isolated interactive React DOM', checks, passed: checks.every(c => c.passed) }))
  process.exitCode = checks.every(c => c.passed) ? 0 : 1
} finally {
  if (root) await act(async () => root.unmount())
  await server.close(); dom.window.close()
  delete globalThis.__workflowApi
}
