import { useEffect } from 'react'

export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => onDismiss?.(), 4000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[300] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md border border-line-strong bg-surface px-5 py-3 text-sm text-ink-heading shadow-raised"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
