import { X } from 'lucide-react'

export default function LoginPrompt({ message, onClose }) {
  if (!message) return null

  return (
    <div className="login-prompt-overlay" onClick={onClose} role="presentation">
      <div
        className="login-prompt"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="login-prompt-title"
        aria-modal="true"
      >
        <button
          type="button"
          className="login-prompt__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h3 id="login-prompt-title">Login required</h3>
        <p>{message}</p>
        <div className="login-prompt__actions">
          <a href="/login" className="btn btn--primary">
            Login
          </a>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
