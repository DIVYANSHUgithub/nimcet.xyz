
import { useEffect, useState } from 'react'
import Button from './ui/Button'
import { backendRequest } from '../lib/backendApi'
import { useAuth } from '../context/useAuth'

export default function DeviceSessionNotice() {
  const { user } = useAuth()
  const [warning, setWarning] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const userId = user?.id
  useEffect(() => {
    if (!userId) return undefined
    const listener = event => setWarning({ userId, message: event.detail })
    window.addEventListener('nimcet-device-conflict', listener)
    return () => window.removeEventListener('nimcet-device-conflict', listener)
  }, [userId])

  if (!warning || warning.userId !== userId) return null
  return <aside className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-lg rounded-xl border border-line bg-surface p-5 shadow-raised" aria-label="Device session">
    <p className="text-sm text-ink-heading" role="alert">{warning.message} Replacing it will end access from the previous session.</p>
    {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={async () => {
        setBusy(true); setError('')
        try {
          await backendRequest('auth/device', { method: 'POST', body: { replace: true } })
          window.location.reload()
        } catch (err) { setError(err.message); setBusy(false) }
      }}>Use this device</Button>
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setWarning(null); setError('') }}>Dismiss</Button>
    </div>
  </aside>
}
