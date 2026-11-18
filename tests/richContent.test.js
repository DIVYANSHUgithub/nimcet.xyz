import test from 'node:test'
import assert from 'node:assert/strict'
import { inlineImageUrl, normalizeQuestion } from '../clientFront/src/utils/normalizeQuestion.js'

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

test('direct Supabase questions and options can use inline image URLs', () => {
  const url = 'https://storage.example.com/diagrams/companies.png'
  const image = { type: 'image', url, alt: 'Revenue comparison chart' }
  const question = normalizeQuestion({
    id: 76,
    question: { schema_version: 1, statement: [{ type: 'text', text: 'See the chart.' }, image] },
    options: [{ blocks: [image] }, 'Neither'],
  })
  assert.equal(inlineImageUrl(question.statementBlocks[1]), url)
  assert.equal(inlineImageUrl(question.options[0].blocks[0]), url)
  assert.equal(inlineImageUrl({ ...image, url: 'javascript:alert(1)' }), '')
})

test('an image-only JSONB statement and image-only option count as question content', () => {
  const picture = { type: 'image', media_id: 'picture', alt: 'Diagram of a triangle' }
  const question = normalizeQuestion({
    id: 1, question: [picture], options: [{ id: 'diagram', blocks: [picture] }, 'None'],
  })
  assert.deepEqual(question.statementBlocks, [picture])
  assert.deepEqual(question.options[0].blocks, [picture])
  assert.equal(question.validationIssues.includes('missing-question'), false)
  assert.equal(question.validationIssues.includes('missing-options'), false)
})
