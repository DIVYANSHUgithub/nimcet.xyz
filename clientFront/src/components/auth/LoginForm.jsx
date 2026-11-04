import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import SocialLogin from './SocialLogin'
import { validateLogin } from '../../utils/validateAuth'

export default function LoginForm({ onSubmit, onForgotPassword, isLoading, isRecoveryLoading }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isLoading) return
    const nextErrors = validateLogin({ email, password })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit?.({ email: email.trim(), password })
  }

  return (
    <section className="p-5 sm:p-8 lg:p-10" aria-labelledby="login-title">
      <header className="mb-6">
        <h1 id="login-title" className="text-3xl font-bold tracking-tight text-ink-heading">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Log in to your NIMCET.XYZ account.</p>
      </header>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-ink-heading">Email address</label>
          <div className={`flex min-h-12 items-center gap-3 rounded-md border px-3 focus-within:ring-2 focus-within:ring-brand/15 ${errors.email ? 'border-danger-fg' : 'border-line-strong'}`}>
            <Mail size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
            <input id="login-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (errors.email) setErrors((current) => ({ ...current, email: '' })) }} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink-heading outline-none placeholder:text-ink-muted" placeholder="name@example.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
          </div>
          {errors.email && <p id="login-email-error" className="mt-1.5 text-xs text-danger" role="alert">{errors.email}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="text-sm font-semibold text-ink-heading">Password</label>
            <button type="button" disabled={isRecoveryLoading} onClick={() => !isRecoveryLoading && onForgotPassword?.(email.trim())} className="text-xs font-medium text-ink-muted underline underline-offset-2 hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60">{isRecoveryLoading ? 'Sending…' : 'Forgot password?'}</button>
          </div>
          <div className={`flex min-h-12 items-center gap-3 rounded-md border px-3 focus-within:ring-2 focus-within:ring-brand/15 ${errors.password ? 'border-danger-fg' : 'border-line-strong'}`}>
            <Lock size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); if (errors.password) setErrors((current) => ({ ...current, password: '' })) }} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink-heading outline-none placeholder:text-ink-muted" placeholder="Enter your password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} />
            <button type="button" className="grid size-8 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-canvas-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {errors.password && <p id="login-password-error" className="mt-1.5 text-xs text-danger" role="alert">{errors.password}</p>}
        </div>

        <button type="submit" className="min-h-12 w-full rounded-md bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading}>{isLoading ? 'Logging in…' : 'Log in'}</button>
      </form>
      <SocialLogin />
      <p className="mt-6 text-center text-sm text-ink-muted">Don&apos;t have an account? <Link to="/signup" className="font-semibold text-ink-heading underline underline-offset-2 hover:text-ink-muted">Sign up</Link></p>
    </section>
  )
}
