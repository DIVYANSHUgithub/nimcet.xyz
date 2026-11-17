import test from 'node:test'
import assert from 'node:assert/strict'
import { rememberOAuthReturn, takeOAuthReturn, clearOAuthReturn } from '../clientFront/src/lib/authReturn.js'

test('OAuth destinations survive navigation, are consumed once, and reject expired or unsafe values', () => {
  const previous = globalThis.window
  const values = new Map()
  globalThis.window = { sessionStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  } }
  try {
    rememberOAuthReturn('/questions/7?answer=show#solution')
    assert.equal(takeOAuthReturn(), '/questions/7?answer=show#solution')
    assert.equal(takeOAuthReturn(), null)
    rememberOAuthReturn('https://evil.test')
    assert.equal(takeOAuthReturn(), '/')
    values.set('nimcet.oauth.return', JSON.stringify({ path: '/tests', at: Date.now() - 31 * 60 * 1000 }))
    assert.equal(takeOAuthReturn(), null)
    values.set('nimcet.oauth.return', 'invalid JSON')
    assert.equal(takeOAuthReturn(), null)
    rememberOAuthReturn('/tests')
    clearOAuthReturn()
    assert.equal(takeOAuthReturn(), null)
  } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
})
