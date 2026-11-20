export function deploymentErrors(env) {
  const errors = []
  if (Object.keys(env).some(name => /^VITE_.*(SERVICE_ROLE|SECRET|DATABASE|PASSWORD)/i.test(name) && env[name])) {
    errors.push('Remove server credentials from VITE_ variables; they are public build inputs.')
  }
  function publicUrl(name, suffix) {
    try {
      const url = new URL(env[name])
      if (url.protocol !== 'https:' || !url.hostname.includes('.') || /^(localhost|127\.|0\.)/.test(url.hostname)
        || url.hostname.endsWith('.localhost') || /(^|\.)example\.com$/.test(url.hostname)
        || url.username || url.password || url.search || url.hash
        || (suffix && url.pathname.replace(/\/$/, '') !== suffix)) throw new Error()
    } catch { errors.push(`${name} must be a public HTTPS URL${suffix ? ` ending in ${suffix}` : ''}.`) }
  }
  publicUrl('VITE_API_BASE_URL', '/api/v1')
  publicUrl('VITE_SUPABASE_URL')
  const key = env.VITE_SUPABASE_ANON_KEY || ''
  let validKey = key.startsWith('sb_publishable_') && key.length > 25
  if (key.startsWith('eyJ')) {
    try { validKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon' } catch { /* invalid token */ }
  }
  if (!validKey) errors.push('VITE_SUPABASE_ANON_KEY must be a publishable key or legacy anon key; never a service key.')
  if (env.VITE_QUESTION_API_MODE !== 'backend') errors.push('Set VITE_QUESTION_API_MODE=backend for this MVP release.')
  if (env.VITE_ENABLE_DETAILED_ANALYTICS && env.VITE_ENABLE_DETAILED_ANALYTICS !== 'false') {
    errors.push('Keep VITE_ENABLE_DETAILED_ANALYTICS=false until detailed analytics is released.')
  }
  return errors
}
