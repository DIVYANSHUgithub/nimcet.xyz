// Verify navigation with real React components and synthetic public questions.
import assert from 'node:assert/strict'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://challenge.test/' })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let submissions = 0
const fixture = { id: 7, status: 'published', question: 'Synthetic challenge?',
  options: ['First', 'Second', 'Third', 'Fourth'], subject: 'Mathematics' }
globalThis.__challengeApi = {
  getRandomMathematicsQuestions: async () => [fixture],
  getQuestionById: async () => fixture,
  getQuestionAnswer: async () => ({ correct_option_id: 'option-2', explanation: 'Synthetic public explanation.' }),
  submitPracticeAnswer: async () => { submissions++; throw new Error('Revealing must not submit a choice') },
}
const server = await createServer({ configFile: false, envDir: false,
  cacheDir: 'node_modules/.vite-challenge-checks', resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [{ name: 'synthetic-challenge-api', enforce: 'pre',
    resolveId(source) { if (source === '../lib/questionsApi') return '\0challenge-api' },
    load(id) { if (id === '\0challenge-api') return Object.keys(globalThis.__challengeApi)
      .map(name => `export const ${name} = (...args) => globalThis.__challengeApi.${name}(...args)`).join('\n') },
  }, react()], server: { middlewareMode: true, hmr: false }, appType: 'custom' })
let root
const flush = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) })
try {
  const { AuthContext } = await server.ssrLoadModule('/src/context/auth-context.js')
  const { default: HighlightQuestion } = await server.ssrLoadModule('/src/components/HighlightQuestion.jsx')
  const { default: QuestionDetail } = await server.ssrLoadModule('/src/pages/QuestionDetail.jsx')
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(AuthContext.Provider, { value: { user: null, loading: false } },
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/', element: React.createElement(HighlightQuestion) }),
        React.createElement(Route, { path: '/questions/:questionId', element: React.createElement(QuestionDetail) }))))))
  await flush()
  const link = [...document.querySelectorAll('a')].find(a => a.textContent.includes('View answer'))
  assert.equal(link?.getAttribute('href'), '/questions/7?answer=show')
  await act(async () => link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
  await flush()
  await flush()
  assert.ok(document.querySelector('main').textContent.includes('Synthetic challenge?'))
  assert.ok(document.querySelector('main').textContent.includes('Correct answer: Third'))
  assert.ok(document.querySelector('main').textContent.includes('Synthetic public explanation.'))
  assert.equal(submissions, 0)
  console.log('Challenge flow passed: View answer navigates to the detail page and reveals the answer without login or a submitted choice.')
} finally {
  if (root) await act(async () => root.unmount())
  await server.close()
  dom.window.close()
  delete globalThis.__challengeApi
}
