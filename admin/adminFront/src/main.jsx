import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '../../../clientFront/src/context/AuthContext.jsx'
import ConnectionStatus from '../../../clientFront/src/components/ConnectionStatus.jsx'
import AppBoundary from '../../../clientFront/src/components/AppBoundary.jsx'
import AdminApp from './AdminApp.jsx'
import './admin.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppBoundary><ConnectionStatus /><AdminApp /></AppBoundary>
    </AuthProvider>
  </React.StrictMode>,
)
