import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { getSupabaseConfigError, supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'

export default function ResetPassword() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    setMessage('')
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      setIsError(true)
      return
    }
    if (password !== confirmation) {
      setMessage('Passwords do not match.')
      setIsError(true)
      return
    }
    if (!supabase) {
      setMessage(getSupabaseConfigError().message)
      setIsError(true)
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage('Password updated. You can continue to your questions.')
      setIsError(false)
      window.setTimeout(() => navigate('/questions'), 900)
    } catch (error) {
      setMessage(error.message || 'Unable to update your password.')
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className="flex flex-1 items-center px-5 py-10">
        <section className="mx-auto w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8" aria-labelledby="reset-title">
          <h1 id="reset-title" className="text-2xl font-bold tracking-tight text-ink-heading">Set a new password</h1>
          <p className="mb-5 mt-2 text-sm leading-6 text-ink-muted">Choose a new password for your account.</p>
          {authLoading ? <p role="status" className="text-sm text-ink-muted">Checking the recovery link…</p> : !user ? (
            <div className="rounded-md border border-line bg-canvas-muted p-4 text-sm text-ink-muted">
              <p>This reset link is missing or expired. Request a new one from the login page.</p>
              <Link to="/login" className="mt-3 inline-flex font-semibold text-ink-heading underline underline-offset-2">Return to login</Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <label className="block text-sm font-medium text-ink-heading">New password<input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/20" /></label>
              <label className="block text-sm font-medium text-ink-heading">Confirm new password<input type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/20" /></label>
              <button disabled={busy} className="min-h-11 w-full rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Updating…' : 'Update password'}</button>
            </form>
          )}
          {message && <p className={`mt-4 rounded-md border p-3 text-sm ${isError ? 'border-danger-border bg-danger-bg text-danger' : 'border-success-border bg-success-bg text-success'}`} role={isError ? 'alert' : 'status'}>{message}</p>}
        </section>
      </main>
      <Footer />
    </div>
  )
}
