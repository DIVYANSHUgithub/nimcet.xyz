import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '../../../clientFront/src/context/AuthContext.jsx'
import AdminApp from './AdminApp.jsx'
import './admin.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AdminApp />
    </AuthProvider>
  </React.StrictMode>,
)
