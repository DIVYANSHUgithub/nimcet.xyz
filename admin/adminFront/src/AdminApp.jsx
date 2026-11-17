import { useEffect, useState } from 'react'
import { backendGet } from '../../../clientFront/src/lib/backendApi.js'
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../../../clientFront/src/lib/supabase.js'
import { useAuth } from '../../../clientFront/src/context/useAuth.js'
import AdminWorkspace from './AdminWorkspace'
import { legalDetails, legalLinks } from '../../../clientFront/src/lib/legal.js'
import { hasAdminAccess } from './adminAccess.js'

export default function AdminApp() {
  const { session, loading: authLoading, signOut } = useAuth()
  const token = session?.access_token ?? null
  const userId = session?.user?.id ?? null
  const [verificationRevision, setVerificationRevision] = useState(0)
  const [access, setAccess] = useState({ token: null, status: 'idle', roles: [], dashboard: null, audit: null })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signInError, setSignInError] = useState('')
  const [signOutError, setSignOutError] = useState('')
  const accessCurrent = token !== null && access.token === token

  useEffect(() => {
    if (!token) return undefined
    const controller = new AbortController()
    backendGet('auth/me', { signal: controller.signal })
      .then((profile) => {
        if (controller.signal.aborted) return null
        const roles = Array.isArray(profile?.roles) ? profile.roles : []
        if (!hasAdminAccess(roles)) {
          setAccess({ token, userId, status: 'denied', roles: [], dashboard: null })
          return null
        }
        setAccess({ token, userId, status: 'loading_dashboard', roles, dashboard: null })
        return backendGet('admin/dashboard', { signal: controller.signal })
          .then((dashboard) => {
            if (!controller.signal.aborted) setAccess({ token, userId, status: 'authorized', roles, dashboard, audit: null })
          })
          .catch((error) => {
            if (controller.signal.aborted || error.name === 'AbortError') return
            setAccess({ token, userId, status: 'dashboard_unavailable', roles, dashboard: null, audit: null })
          })
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return
        setAccess({ token, userId, status: 'unavailable', roles: [], dashboard: null, audit: null })
      })
    return () => controller.abort()
  }, [token, userId, verificationRevision])

  const handleSignIn = async (event) => {
    event.preventDefault()
    setSignInError('')
    if (!supabase) {
      setSignInError(getSupabaseConfigError().message)
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setSignInError('Sign-in failed. Check your credentials and try again.')
      else setPassword('')
    } catch {
      setSignInError('Sign-in is temporarily unavailable. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    setSignOutError('')
    try {
      await signOut()
      setAccess({ token: null, status: 'idle', roles: [], dashboard: null, audit: null })
    } catch {
      setSignOutError('Sign-out failed. Please try again.')
    }
  }

  let content
  if (!isSupabaseConfigured) {
    content = <Notice title="Authentication is not configured">Set the public Supabase URL and anon key for this app before signing in.</Notice>
  } else if (authLoading) {
    content = <p className="admin-status" role="status">Checking your sign-in…</p>
  } else if (!token) {
    content = (
      <form className="admin-form" onSubmit={handleSignIn}>
        <label>Email<input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {signInError && <p className="admin-error" role="alert">{signInError}</p>}
        <button disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
    )
  } else if (!accessCurrent || access.status === 'idle' || access.status === 'loading_dashboard') {
    content = <p className="admin-status" role="status">Verifying admin access with the backend…</p>
  } else if (access.status === 'unavailable') {
    content = <Notice title="Admin access could not be verified">The authorization service is unavailable or not configured. No admin tools are enabled.</Notice>
  } else if (access.status === 'denied') {
    content = <Notice title="Admin access required">The backend did not assign an editor, Test Manager or administrator role to this account. Contact the project owner if you need access.</Notice>
  } else {
    content = null
  }
  const workspaceVisible = userId && access.userId === userId && hasAdminAccess(access.roles)
    && ['authorized', 'dashboard_unavailable', 'loading_dashboard'].includes(access.status)
  const accessPending = !accessCurrent || access.status === 'loading_dashboard'

  return (
    <main id="main-content" className={`admin-page ${workspaceVisible ? 'admin-page--workspace' : ''}`}>
      <section className={`admin-panel ${workspaceVisible ? 'admin-panel--workspace' : ''}`} aria-labelledby="admin-title">
        <p className="admin-eyebrow">NIMCET.XYZ</p>
        <h1 id="admin-title">Administration</h1>
        <p className="admin-intro">Sign in with your existing account. Admin access is checked by the backend.</p>
        {workspaceVisible ? <div>
          <p className="admin-success" role="status">{accessPending ? 'Rechecking access… Your open tools will remain in place.' : `Access verified for: ${access.roles.join(', ')}`}</p>
          <div inert={accessPending} aria-busy={accessPending}>
            <AdminWorkspace key={userId} roles={access.roles}
              overview={access.dashboard ? <DashboardCounts counts={access.dashboard} /> : <Notice title="Dashboard unavailable">Counts could not be loaded. You can continue using the tools permitted for your role.</Notice>}
              />
          </div>
        </div> : content}
        {token && accessCurrent && access.status === 'unavailable' && <button className="admin-secondary" onClick={() => setVerificationRevision(value => value + 1)}>Retry access check</button>}
        {token && <div className="admin-session-actions">
          {signOutError && <p className="admin-error" role="alert">{signOutError}</p>}
          <button className="admin-secondary" type="button" onClick={handleSignOut}>Sign out</button>
        </div>}
        <p className="admin-security-note">This interface does not use signup metadata or browser state to grant roles.</p>
        <nav className="admin-legal-links" aria-label="Legal and support">
          {legalLinks.map(link => <a key={link.to} href={`${legalDetails.origin}${link.to}`}>{link.label}</a>)}
        </nav>
      </section>
    </main>
  )
}

function DashboardCounts({ counts }) {
  const values = [
    ['Questions', counts.total_questions],
    ['Published', counts.published_questions],
    ['Drafts', counts.draft_questions],
  ]
  return <section className="admin-counts" aria-label="Question bank counts">
    {values.map(([label, value]) => <div className="admin-count" key={label}><span>{label}</span><strong>{value}</strong></div>)}
  </section>
}

function Notice({ title, children }) {
  return <div className="admin-notice" role="status"><h2>{title}</h2><p>{children}</p></div>
}
