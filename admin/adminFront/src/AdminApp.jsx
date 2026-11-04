import { useEffect, useRef, useState } from 'react'
import { backendGet, backendRequest } from '../../../clientFront/src/lib/backendApi.js'
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../../../clientFront/src/lib/supabase.js'
import { useAuth } from '../../../clientFront/src/context/useAuth.js'
import { hasAdminAccess } from './adminAccess.js'

export default function AdminApp() {
  const { session, loading: authLoading, signOut } = useAuth()
  const token = session?.access_token ?? null
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
        const roles = Array.isArray(profile?.roles) ? profile.roles : []
        if (!hasAdminAccess(roles)) {
          setAccess({ token, status: 'denied', roles: [], dashboard: null })
          return null
        }
        setAccess({ token, status: 'loading_dashboard', roles, dashboard: null })
        return backendGet('admin/dashboard', { signal: controller.signal })
          .then(async (dashboard) => {
            if (!roles.includes('super_administrator')) {
              setAccess({ token, status: 'authorized', roles, dashboard, audit: null })
              return
            }
            try {
              const audit = await backendGet('admin/audit-log', { params: { page: 1, page_size: 20 }, signal: controller.signal })
              setAccess({ token, status: 'authorized', roles, dashboard, audit })
            } catch (error) {
              if (controller.signal.aborted || error.name === 'AbortError') return
              setAccess({ token, status: 'authorized', roles, dashboard, audit: { error: true, items: [] } })
            }
          })
          .catch((error) => {
            if (controller.signal.aborted || error.name === 'AbortError') return
            setAccess({ token, status: 'dashboard_unavailable', roles, dashboard: null, audit: null })
          })
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return
        setAccess({ token, status: 'unavailable', roles: [], dashboard: null, audit: null })
      })
    return () => controller.abort()
  }, [token])

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
    content = <Notice title="Admin access required">The backend did not assign an editor or administrator role to this account. Contact the project owner if you need access.</Notice>
  } else {
    content = (
      <>
        <p className="admin-success" role="status">Access verified by the backend for: {access.roles.join(', ')}</p>
        {access.dashboard ? <DashboardCounts counts={access.dashboard} /> : <Notice title="Dashboard data is unavailable">The backend verified your role, but the read-only dashboard could not load.</Notice>}
        {access.roles.includes('super_administrator') && <>
          <RoleManagement />
          <AdminAuditTrail audit={access.audit} />
        </>}
        <Notice title="Editorial tools are not enabled yet">Question editing, media workflows, publishing, and audit views require their protected backend APIs.</Notice>
      </>
    )
  }

  return (
    <main className="admin-page">
      <section className="admin-panel" aria-labelledby="admin-title">
        <p className="admin-eyebrow">NIMCET.XYZ</p>
        <h1 id="admin-title">Administration</h1>
        <p className="admin-intro">Sign in with your existing account. Admin access is checked by the backend.</p>
        {content}
        {token && <div className="admin-session-actions">
          {signOutError && <p className="admin-error" role="alert">{signOutError}</p>}
          <button className="admin-secondary" type="button" onClick={handleSignOut}>Sign out</button>
        </div>}
        <p className="admin-security-note">This interface does not use signup metadata or browser state to grant roles.</p>
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

function AdminAuditTrail({ audit }) {
  if (!audit) return null
  if (audit.error) return <Notice title="Audit log is unavailable">Role controls remain protected, but the audit history could not be loaded.</Notice>
  return <section className="admin-audit" aria-labelledby="audit-title">
    <h2 id="audit-title">Recent admin activity</h2>
    {audit.items.length === 0 ? <p>No audit events have been recorded.</p> : <ol>
      {audit.items.map((item) => <li key={item.id}>
        <strong>{item.action_code}</strong>
        <span>{item.reason || 'No reason provided'}</span>
        <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
      </li>)}
    </ol>}
  </section>
}

function RoleManagement() {
  const [userId, setUserId] = useState('')
  const [roleCode, setRoleCode] = useState('editor')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const formRef = useRef(null)

  const changeRole = async (action) => {
    if (!formRef.current?.reportValidity()) return
    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      const response = await backendRequest(
        `admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleCode)}`,
        { method: action === 'grant' ? 'POST' : 'DELETE', body: { reason: reason.trim() } },
      )
      setMessage(response.already_assigned
        ? `${roleCode} is already assigned to this user.`
        : `${roleCode} role ${action === 'grant' ? 'granted' : 'revoked'} and recorded in the audit log.`)
    } catch (requestError) {
      setError(requestError.message || 'The role change could not be completed.')
    } finally {
      setSubmitting(false)
    }
  }

  return <section className="admin-role-panel" aria-labelledby="role-management-title">
    <h2 id="role-management-title">Trusted role assignment</h2>
    <p>Only a super administrator can change roles. Self-changes and removal of the last super administrator are rejected by the backend.</p>
    <form ref={formRef} className="admin-form" onSubmit={(event) => event.preventDefault()}>
      <label>User UUID<input required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" value={userId} onChange={(event) => setUserId(event.target.value)} /></label>
      <label>Role<select value={roleCode} onChange={(event) => setRoleCode(event.target.value)}>
        <option value="editor">Editor</option>
        <option value="administrator">Administrator</option>
        <option value="super_administrator">Super administrator</option>
      </select></label>
      <label>Reason<textarea required minLength={10} maxLength={500} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}
      <div className="admin-role-actions">
        <button disabled={submitting} type="button" onClick={() => changeRole('grant')}>{submitting ? 'Saving…' : 'Grant role'}</button>
        <button className="admin-secondary" disabled={submitting} type="button" onClick={() => changeRole('revoke')}>{submitting ? 'Saving…' : 'Revoke role'}</button>
      </div>
    </form>
  </section>
}

function Notice({ title, children }) {
  return <div className="admin-notice" role="status"><h2>{title}</h2><p>{children}</p></div>
}
