import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, ClipboardList, History, KeyRound, UserRound } from 'lucide-react'
import Button from '../components/ui/Button'
import PageShell from '../components/ui/PageShell'
import ProfileProgress from '../components/ProfileProgress'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { formatDisplayDate } from '../utils/formatDate'
import { isValidEmail } from '../utils/validateAuth'

const cardClass = 'rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6'
const inputClass = 'mt-1.5 min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:bg-canvas-muted'
const providerNames = { email: 'Email and password', google: 'Google', github: 'GitHub' }
const shortcuts = [
  { to: '/tests', icon: ClipboardList, label: 'Browse available tests' },
  { to: '/questions', icon: BookOpen, label: 'Practice questions' },
  { to: '/pyq', icon: History, label: 'Previous-year questions' },
]

function Feedback({ feedback }) {
  if (!feedback) return null
  return <p className={`mt-3 rounded-md border px-3 py-2 text-sm ${feedback.error ? 'border-danger-border bg-danger-bg text-danger' : 'border-success-border bg-success-bg text-success'}`} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>
}

function ProfileDetails({ fullName, username }) {
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const values = { fullName, username, ...draft }
  const nameChanged = values.fullName.trim() !== fullName
  const usernameChanged = values.username.trim() !== username
  const dirty = nameChanged || usernameChanged

  function edit(event) {
    setFeedback(null)
    const { name, value } = event.target
    setDraft(previous => ({ ...previous, [name]: value }))
  }

  async function save(event) {
    event.preventDefault()
    if (saving || !dirty) return
    if (!values.fullName.trim()) {
      setFeedback({ error: true, message: 'Enter your full name.' })
      event.currentTarget.elements.fullName.focus()
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const { error } = await supabase.auth.updateUser({ data: {
        ...(nameChanged && { full_name: values.fullName.trim() }),
        ...(usernameChanged && { username: values.username.trim() || null }),
      } })
      if (error) throw error
      setDraft({})
      setFeedback({ message: 'Profile saved.' })
    } catch (error) {
      setFeedback({ error: true, message: error.message || 'Could not save your profile. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  return <section className={cardClass} aria-labelledby="profile-details">
    <h2 id="profile-details" className="text-lg font-bold text-ink-heading">Personal details</h2>
    <form className="mt-4 space-y-4" onSubmit={save}>
      <div>
        <label className="text-sm font-medium text-ink-heading" htmlFor="profile-name">Full name</label>
        <input className={inputClass} id="profile-name" name="fullName" autoComplete="name" value={values.fullName} onChange={edit} required disabled={saving} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink-heading" htmlFor="profile-username">Username <span className="font-normal text-ink-muted">(optional)</span></label>
        <input className={inputClass} id="profile-username" name="username" autoComplete="username" value={values.username} onChange={edit} disabled={saving} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save changes'}</Button>
        {dirty && <Button variant="ghost" disabled={saving} onClick={() => { setDraft({}); setFeedback(null) }}>Cancel</Button>}
      </div>
    </form>
    <Feedback feedback={feedback} />
  </section>
}

function SignInSettings({ user }) {
  const [emailDraft, setEmailDraft] = useState(null)
  const [busy, setBusy] = useState('')
  const [feedback, setFeedback] = useState(null)
  const email = user.email ?? ''
  const providers = [...new Set([
    ...(user.identities ?? []).map(identity => identity.provider),
    ...(Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []),
    user.app_metadata?.provider,
  ].filter(Boolean))]
  const hasEmailSignIn = providers.includes('email')
  const canSubmitEmail = isValidEmail(emailDraft) && emailDraft.trim().toLowerCase() !== email.toLowerCase()

  async function changeEmail(event) {
    event.preventDefault()
    if (busy || !canSubmitEmail) return
    await run('email', async () => {
      const { data, error } = await supabase.auth.updateUser({ email: emailDraft.trim() }, {
        emailRedirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
      setEmailDraft(null)
      return data.user?.email?.toLowerCase() === emailDraft.trim().toLowerCase()
        ? 'Your sign-in email was updated.'
        : 'Check your inboxes for the confirmation links to finish changing your email.'
    })
  }

  function sendReset() {
    return run('password', async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      return 'Check your email for the password reset link.'
    })
  }

  async function run(action, submit) {
    if (busy) return
    setBusy(action)
    setFeedback(null)
    try {
      setFeedback({ message: await submit() })
    } catch (error) {
      setFeedback({ error: true, message: error.message || 'Could not complete the request. Try again.' })
    } finally {
      setBusy('')
    }
  }

  return <section className={cardClass} aria-labelledby="profile-sign-in">
    <h2 id="profile-sign-in" className="text-lg font-bold text-ink-heading">Sign-in settings</h2>
    <dl className="mt-4 grid gap-4 text-sm">
      <div>
        <dt className="font-medium text-ink-heading">Email address</dt>
        <dd className="mt-1 wrap-anywhere text-ink-muted">{email || 'No email address on this account'}</dd>
        {user.new_email && <dd className="mt-1 wrap-anywhere text-warning">Pending confirmation for {user.new_email}</dd>}
      </div>
      {providers.length > 0 && <div>
        <dt className="font-medium text-ink-heading">Sign-in methods</dt>
        <dd className="mt-1 text-ink-muted">{providers.map(provider => Object.hasOwn(providerNames, provider) ? providerNames[provider] : provider).join(', ')}</dd>
      </div>}
    </dl>
    {hasEmailSignIn && emailDraft !== null ? (
      <form className="mt-4" onSubmit={changeEmail}>
        <label className="text-sm font-medium text-ink-heading" htmlFor="profile-new-email">New email address</label>
        <input className={inputClass} id="profile-new-email" name="email" autoComplete="email" type="email" required value={emailDraft} onChange={event => setEmailDraft(event.target.value)} disabled={Boolean(busy)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={Boolean(busy) || !canSubmitEmail}>{busy === 'email' ? 'Sending…' : 'Send confirmation'}</Button>
          <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => { setEmailDraft(null); setFeedback(null) }}>Cancel</Button>
        </div>
      </form>
    ) : hasEmailSignIn && (
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => { setEmailDraft(user.new_email || ''); setFeedback(null) }}>Change email</Button>
        {email && <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={sendReset}>
          <KeyRound size={15} aria-hidden="true" /> {busy === 'password' ? 'Sending…' : 'Send password reset'}
        </Button>}
      </div>
    )}
    <Feedback feedback={feedback} />
    <Link className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-accent hover:underline" to="/contact#account">Get account help <ArrowRight size={14} aria-hidden="true" /></Link>
  </section>
}

export default function Profile() {
  const { user } = useAuth()
  const metadata = user.user_metadata ?? {}
  const fullName = [metadata.full_name, metadata.name].find(value => typeof value === 'string' && value.trim())?.trim() ?? ''
  const username = typeof metadata.username === 'string' ? metadata.username.trim() : ''
  const initials = fullName.split(/\s+/u).filter(Boolean).slice(0, 2).map(word => [...word][0]).join('').toUpperCase()
  const joined = new Date(user.created_at)

  return <PageShell className="bg-canvas-muted">
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <section className="rounded-xl bg-brand px-5 py-7 text-white shadow-card sm:px-8 sm:py-9" aria-labelledby="profile-title">
        <h1 id="profile-title" className="text-3xl font-bold tracking-tight">My profile</h1>
        <div className="mt-5 flex items-center gap-4 border-t border-white/20 pt-5">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-white/15 text-lg font-bold" aria-hidden="true">
            {initials || <UserRound size={25} />}
          </div>
          <div className="min-w-0">
            <p className="wrap-anywhere text-xl font-semibold">{fullName || username || 'Student'}</p>
            {(fullName && username) && <p className="mt-0.5 wrap-anywhere text-sm text-gray-200">@{username}</p>}
            {Number.isFinite(joined.getTime()) && <p className="mt-0.5 text-sm text-gray-200">Joined <time dateTime={user.created_at}>{formatDisplayDate(joined)}</time></p>}
          </div>
        </div>
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" key={user.id}>
        <div className="grid gap-5">
          <ProfileDetails fullName={fullName} username={username} />
          <SignInSettings user={user} />
        </div>
        <div className="grid gap-5">
          <ProfileProgress />
          <section className={cardClass} aria-labelledby="profile-study-links">
            <h2 id="profile-study-links" className="text-lg font-bold text-ink-heading">Study resources</h2>
            <ul className="mt-3 divide-y divide-line">
              {shortcuts.map(({ to, icon: Icon, label }) => <li key={to}>
                <Link to={to} className="group flex min-h-11 items-center gap-3 rounded-sm py-2 text-sm font-medium text-ink-heading hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  <Icon size={17} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  <ArrowRight size={15} className="shrink-0 text-ink-muted group-hover:text-accent" aria-hidden="true" />
                </Link>
              </li>)}
            </ul>
          </section>
        </div>
      </div>
    </main>
  </PageShell>
}
