import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import Button from './ui/Button'

export default function LoginPrompt({ message, onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    if (!message) return undefined

    const previous = document.activeElement
    closeRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [message, onClose])

  if (!message) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-sm rounded-lg bg-surface p-7 shadow-raised"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="login-prompt-title"
        aria-modal="true"
      >
        <button
          ref={closeRef}
          type="button"
          className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-sm text-ink-muted hover:bg-canvas-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h3 id="login-prompt-title" className="mb-2 text-lg font-semibold text-ink-heading">
          Login required
        </h3>
        <p className="mb-5 text-[0.9375rem] leading-relaxed text-ink-muted">{message}</p>
        <div className="flex gap-3">
          <Button as={Link} to="/login" variant="primary">
            Login
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
