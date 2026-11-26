import { useCallback } from 'react'
import { useAuth } from '../context/useAuth'
import Toast from './Toast'

export default function DeviceSessionNotice() {
  const { deviceSessionMessage, setDeviceSessionMessage } = useAuth()
  const dismiss = useCallback(() => setDeviceSessionMessage(''), [setDeviceSessionMessage])
  return <Toast message={deviceSessionMessage} onDismiss={dismiss} />
}
