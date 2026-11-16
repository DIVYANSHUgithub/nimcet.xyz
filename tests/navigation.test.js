import test from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnPath, pageTitle, isNavActive } from '../clientFront/src/lib/navigation.js'

test('login returns to approved internal routes without allowing external redirects', () => {
  for (const path of ['/tests', '/results', '/pyq', '/questions?pyq=true', '/attempts/abc-123/result']) assert.equal(safeReturnPath(path), path)
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/tests\n', undefined]) assert.equal(safeReturnPath(path), '/questions')
})

test('page titles distinguish active attempts from results', () => {
  assert.equal(pageTitle('/attempts/abc'), 'Test attempt')
  assert.equal(pageTitle('/attempts/abc/result'), 'Attempt result')
  assert.equal(pageTitle('/pyq'), 'Previous-year questions')
})

test('active navigation follows question detail and private result routes', () => {
  assert.equal(isNavActive('/questions/7', '/questions'), true)
  assert.equal(isNavActive('/attempts/abc', '/tests'), true)
  assert.equal(isNavActive('/attempts/abc/result', '/tests'), false)
  assert.equal(isNavActive('/attempts/abc/result', '/results'), true)
  assert.equal(isNavActive('/pyq', '/pyq'), true)
})
