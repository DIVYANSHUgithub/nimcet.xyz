import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeQuestion } from '../clientFront/src/utils/normalizeQuestion.js'

test('rich browse questions preserve stable IDs and blocks without requiring answer data', () => {
  const options = ['one', 'two', 'three', 'four'].map(id => ({ id, blocks: [{ type: 'text', text: id }] }))
  const row = { id: 1, status: 'published', statement_blocks: [{ type: 'latex', text: 'x^2' }], options, option_ids: options.map(o => o.id) }
  const question = normalizeQuestion(row)
  assert.deepEqual(question.statementBlocks, row.statement_blocks)
  assert.deepEqual(question.optionIds, ['one', 'two', 'three', 'four'])
  assert.deepEqual(question.options[0].blocks, options[0].blocks)
  assert.equal(question.options[0].id, 'one')
  assert.ok(Number.isNaN(question.correctOptionIndex))
  assert.equal(question.correctAnswer, '')
})
