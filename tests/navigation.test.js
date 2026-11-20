import test from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnPath, signInReturnPath, authLinkTo, pageTitle, isNavActive } from '../clientFront/src/lib/navigation.js'

test('login returns to approved internal routes without allowing external redirects', () => {
  for (const path of ['/', '/#about', '/about', '/about/', '/contact#account', '/tests', '/results', '/pyq', '/questions?pyq=true', '/attempts/abc-123/result']) assert.equal(safeReturnPath(path), path)
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/tests\n', undefined]) assert.equal(safeReturnPath(path), '/questions')
})

test('auth entry and cross-auth links preserve the original path, filters and anchor', () => {
  const origin = { pathname: '/questions/7', search: '?answer=show', hash: '#solution' }
  const link = authLinkTo('/login', origin)
  assert.equal(signInReturnPath({ ...link }), '/questions/7?answer=show#solution')
  assert.equal(signInReturnPath(authLinkTo('/signup', link)), '/questions/7?answer=show#solution')
  assert.equal(signInReturnPath({ pathname: '/login', state: { from: '/attempts/abc#question-2' } }), '/attempts/abc#question-2')
  assert.equal(signInReturnPath({ pathname: '/login', state: { from: '/profile' } }), '/profile')
  assert.equal(signInReturnPath(authLinkTo('/signup', authLinkTo('/login', { pathname: '/profile/' }))), '/profile/')
  assert.equal(signInReturnPath({ pathname: '/questions', search: '?next=/results' }), '/questions?next=/results')
  assert.equal(signInReturnPath({ pathname: '/login' }), '/')
  assert.equal(signInReturnPath({ pathname: '/login', search: '?next=https://evil.test' }), '/')
})

test('page titles distinguish active attempts from results', () => {
  assert.equal(pageTitle('/attempts/abc'), 'Test attempt')
  assert.equal(pageTitle('/attempts/abc/result'), 'Attempt result')
  assert.equal(pageTitle('/pyq'), 'Previous-year questions')
  assert.equal(pageTitle('/profile'), 'My profile')
  assert.equal(pageTitle('/about'), 'About')
})

test('active navigation follows question detail and private result routes', () => {
  assert.equal(isNavActive('/questions/7', '/questions'), true)
  assert.equal(isNavActive('/attempts/abc', '/tests'), true)
  assert.equal(isNavActive('/attempts/abc/result', '/tests'), false)
  assert.equal(isNavActive('/attempts/abc/result', '/results'), true)
  assert.equal(isNavActive('/pyq', '/pyq'), true)
})
