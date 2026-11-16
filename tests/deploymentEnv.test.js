import test from 'node:test'
import assert from 'node:assert/strict'
import { deploymentErrors } from '../clientFront/scripts/deployment-env.mjs'

const valid = {
  VITE_API_BASE_URL: 'https://api.nimcet.xyz/api/v1',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_fixture_public_key',
  VITE_QUESTION_API_MODE: 'backend',
}

test('deployment accepts public URLs and rejects local API, service key and unavailable features', () => {
  assert.deepEqual(deploymentErrors(valid), [])
  const service = `eyJ.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.fixture`
  const errors = deploymentErrors({ ...valid, VITE_API_BASE_URL: 'http://localhost:8000/api/v1',
    VITE_SUPABASE_ANON_KEY: service, VITE_ENABLE_PYQ: 'true' })
  assert.equal(errors.length, 3)
  assert.equal(errors.some(error => error.includes(service)), false)
})
