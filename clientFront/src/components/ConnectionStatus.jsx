import { useEffect, useState } from 'react'

export default function ConnectionStatus() {
  const [status, setStatus] = useState(() => ({ online: navigator.onLine, recovered: false }))
  useEffect(() => {
    const update = () => setStatus(current => ({ online: navigator.onLine, recovered: navigator.onLine && !current.online }))
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  if (status.online && !status.recovered) return null
  return <aside className="connection-status" role="status" aria-live="polite">
    {status.online ? 'Connection restored. Check the current state before retrying an interrupted action.' : 'You appear to be offline. Reconnect to load content or synchronize answers.'}
    {status.online && <button type="button" onClick={() => setStatus({ online: true, recovered: false })}>Dismiss</button>}
  </aside>
}
