import test from 'node:test'
import assert from 'node:assert/strict'
import { attemptElapsedSeconds } from '../clientFront/src/lib/testHistory.js'

const attempt = {
  started_at: '2026-11-15T17:16:27Z',
  deadline_at: '2026-11-15T17:17:27Z',
  submitted_at: '2026-11-15T17:25:51Z',
}

test('delayed expiry processing does not extend time spent taking the test', () => {
  assert.equal(attemptElapsedSeconds(attempt), 60)
  assert.equal(attemptElapsedSeconds({ ...attempt, submitted_at: '2026-11-15T17:16:57Z' }), 30)
})

test('unfinished attempts have no completed duration and old responses remain supported', () => {
  assert.equal(attemptElapsedSeconds({ ...attempt, submitted_at: null }), null)
  assert.equal(attemptElapsedSeconds({ ...attempt, deadline_at: null }), 564)
  assert.equal(attemptElapsedSeconds({ ...attempt, started_at: 'invalid' }), null)
  assert.equal(attemptElapsedSeconds({ ...attempt, submitted_at: '2026-11-15T17:16:20Z' }), 0)
})
