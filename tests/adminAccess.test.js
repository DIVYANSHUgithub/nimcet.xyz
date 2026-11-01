import test from 'node:test'
import assert from 'node:assert/strict'
import { hasAdminAccess } from '../admin/src/adminAccess.js'

test('admin access requires a trusted backend role from the supported role set', () => {
  assert.equal(hasAdminAccess(undefined), false)
  assert.equal(hasAdminAccess('administrator'), false)
  assert.equal(hasAdminAccess([]), false)
  assert.equal(hasAdminAccess(['student']), false)
  assert.equal(hasAdminAccess(['editor']), true)
  assert.equal(hasAdminAccess(['administrator']), true)
  assert.equal(hasAdminAccess(['super_administrator']), true)
})
