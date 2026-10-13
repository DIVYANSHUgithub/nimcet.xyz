import { useState } from 'react'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import SocialLogin from './SocialLogin'

export default function LoginForm({ onSubmit, onSocialClick, isLoading }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const next = {}
    if (!identifier.trim()) {
      next.identifier = 'Enter your email or username.'
    }
    if (!password) {
      next.password = 'Enter your password.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit?.({ identifier: identifier.trim(), password })
  }

  return (
    <div className="login-form">
      <div className="login-form__header">
        <h1 className="login-form__title">Welcome Back</h1>
        <p className="login-form__subtitle">Login to continue your NIMCET preparation.</p>
      </div>

      <form className="login-form__form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="login-identifier" className="form-field__label">
            Email or Username
          </label>
          <div className={`form-field__input-wrap ${errors.identifier ? 'form-field__input-wrap--error' : ''}`}>
            <User size={18} className="form-field__icon" aria-hidden="true" />
            <input
              id="login-identifier"
              type="text"
              name="identifier"
              className="form-field__input"
              placeholder="Enter your email or username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value)
                if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }))
              }}
              autoComplete="username"
              aria-invalid={Boolean(errors.identifier)}
              aria-describedby={errors.identifier ? 'login-identifier-error' : undefined}
            />
          </div>
          {errors.identifier && (
            <p id="login-identifier-error" className="form-field__error" role="alert">
              {errors.identifier}
            </p>
          )}
        </div>

        <div className="form-field">
          <div className="form-field__label-row">
            <label htmlFor="login-password" className="form-field__label">
              Password
            </label>
            <button type="button" className="form-field__link">
              Forgot password?
            </button>
          </div>
          <div className={`form-field__input-wrap ${errors.password ? 'form-field__input-wrap--error' : ''}`}>
            <Lock size={18} className="form-field__icon" aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="form-field__input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
              }}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
            />
            <button
              type="button"
              className="form-field__toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" className="form-field__error" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <button type="submit" className="btn btn--primary btn--full login-form__submit" disabled={isLoading}>
          {isLoading ? 'Logging in…' : 'Login'}
        </button>
      </form>

      <SocialLogin onSocialClick={onSocialClick} />

      <p className="login-form__signup">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="login-form__signup-link">
          Sign Up
        </Link>
      </p>
    </div>
  )
}
