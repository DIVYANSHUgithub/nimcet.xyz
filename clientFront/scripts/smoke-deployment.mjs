// Read-only smoke checks. Usage: node scripts/smoke-deployment.mjs API_BASE FRONTEND_ORIGIN
const [apiBase, origin] = process.argv.slice(2)
if (!apiBase || !origin) throw new Error('Supply the HTTPS API base ending /api/v1 and exact frontend origin.')
const base = new URL(apiBase)
if (base.protocol !== 'https:' || base.pathname.replace(/\/$/, '') !== '/api/v1'
  || new URL(origin).origin !== origin) throw new Error('Invalid API base or frontend origin.')
const checks = []
async function check(name, path, expectedStatus, options = {}) {
  const response = await fetch(path, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) })
  if (response.status !== expectedStatus) throw new Error(`${name}: unexpected HTTP ${response.status}`)
  checks.push(name)
  return response
}
try {
  await check('API health', new URL('/health', base), 200)
  await check('API readiness', new URL('/ready', base), 200)
  const response = await check('public question browsing', `${apiBase.replace(/\/$/, '')}/questions?page_size=1`, 200)
  const body = await response.json()
  if (!Array.isArray(body.items) || body.items.length === 0) throw new Error('No published questions are available.')
  await check('test authentication required', `${apiBase.replace(/\/$/, '')}/tests`, 401)
  const cors = await check('frontend CORS preflight', `${apiBase.replace(/\/$/, '')}/tests`, 200, {
    method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,content-type' },
  })
  if (cors.headers.get('access-control-allow-origin') !== origin) throw new Error('Frontend origin is not allowed by the API.')
  console.log(JSON.stringify({ passed: true, checks }))
} catch (error) {
  console.error(JSON.stringify({ passed: false, checks, message: error.message }))
  process.exitCode = 1
}
