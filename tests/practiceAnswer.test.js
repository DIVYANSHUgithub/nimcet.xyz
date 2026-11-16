import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluatePracticeAnswer } from '../clientFront/src/utils/practiceAnswer.js'

const question = { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 2 }

test('practice feedback identifies the selected correct option', () => {
  assert.deepEqual(evaluatePracticeAnswer(question, 2), {
    selectedOptionIndex: 2,
    correctOptionIndex: 2,
    isCorrect: true,
  })
})

test('practice feedback identifies an incorrect selection without changing the key', () => {
  assert.deepEqual(evaluatePracticeAnswer(question, 1), {
    selectedOptionIndex: 1,
    correctOptionIndex: 2,
    isCorrect: false,
  })
})

test('practice feedback is unavailable for missing keys or invalid selections', () => {
  assert.equal(evaluatePracticeAnswer({ options: ['A', 'B'], correctOptionIndex: Number.NaN }, 0), null)
  assert.equal(evaluatePracticeAnswer({ options: ['A', 'B'], correctOptionIndex: 2 }, 0), null)
  assert.equal(evaluatePracticeAnswer(question, -1), null)
  assert.equal(evaluatePracticeAnswer(question, 4), null)
})
