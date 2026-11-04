import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, AtSign, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import SocialSignup from './SocialSignup'
import { validateSignup } from '../../utils/validateAuth'

const initialValues = { fullName: '', email: '', username: '', password: '', confirmPassword: '' }

export default function SignupForm({ onSubmit }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState({ password: false, confirmPassword: false })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading) return
    setNotice('')
    const nextErrors = validateSignup(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setLoading(true)
    try {
      const result = await onSubmit?.({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        username: values.username.trim(),
        password: values.password,
      })
      if (result?.error) setNotice(result.error)
      else if (result?.message) setNotice(result.message)
    } catch (error) {
      console.error('Signup failed:', error)
      setNotice(error?.message || 'Unable to create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { name: 'fullName', label: 'Full name', placeholder: 'Enter your full name', type: 'text', autoComplete: 'name', Icon: UserRound },
    { name: 'email', label: 'Email address', placeholder: 'Enter your email address', type: 'email', autoComplete: 'email', Icon: Mail },
    { name: 'username', label: 'Username', placeholder: 'Choose a username', type: 'text', autoComplete: 'username', Icon: AtSign },
    { name: 'password', label: 'Password', placeholder: 'Create a password', type: 'password', autoComplete: 'new-password', Icon: Lock },
    { name: 'confirmPassword', label: 'Confirm password', placeholder: 'Confirm your password', type: 'password', autoComplete: 'new-password', Icon: Lock },
  ]

  return (
    <section className="px-5 py-7 md:px-10 md:py-10" aria-labelledby="signup-title">
      <h1 id="signup-title" className="text-[clamp(1.75rem,3vw,2.125rem)] font-bold leading-tight tracking-tight text-ink-heading">Create your account</h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-ink-muted">Join NIMCET.XYZ and take your preparation forward.</p>
      <form onSubmit={handleSubmit} noValidate>
        {fields.map(({ name, label, placeholder, type, autoComplete, Icon }) => {
          const isPassword = type === 'password'
          const inputType = isPassword ? (show[name] ? 'text' : 'password') : type
          const errorId = `signup-${name}-error`
          return (
            <div className="mb-4" key={name}>
              <label htmlFor={`signup-${name}`} className="mb-1.5 block text-sm font-medium text-ink-heading">{label}</label>
              <div className={`flex min-h-11 items-center gap-3 rounded-md border bg-surface px-3 focus-within:ring-2 focus-within:ring-brand/15 ${errors[name] ? 'border-danger-fg' : 'border-line-strong'}`}>
                <Icon size={17} className="shrink-0 text-ink-muted" aria-hidden="true" />
                <input id={`signup-${name}`} name={name} value={values[name]} onChange={handleChange} type={inputType} placeholder={placeholder} autoComplete={autoComplete} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink-heading outline-none placeholder:text-ink-muted" aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? errorId : undefined} />
                {isPassword && <button type="button" className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-canvas-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setShow((current) => ({ ...current, [name]: !current[name] }))} aria-label={show[name] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={show[name]}>{show[name] ? <EyeOff size={17} /> : <Eye size={17} />}</button>}
              </div>
              {errors[name] && <p id={errorId} className="mt-1.5 text-xs text-danger" role="alert">{errors[name]}</p>}
              {name === 'password' && !errors.password && <p className="mt-1.5 text-xs text-ink-muted">At least 6 characters.</p>}
            </div>
          )
        })}
        <button type="submit" className="mt-1 min-h-12 w-full rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        {notice && <p className="mt-3 rounded-md border border-line bg-canvas-muted px-3 py-2.5 text-sm text-ink" role="status">{notice}</p>}
      </form>
      <SocialSignup />
      <p className="mt-5 text-center text-sm text-ink-muted">Already have an account? <Link className="font-semibold text-ink-heading underline underline-offset-4" to="/login">Log in</Link></p>
    </section>
  )
}
