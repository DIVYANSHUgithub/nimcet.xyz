import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const QuestionBank = lazy(() => import('./pages/QuestionBank'))
const QuestionDetail = lazy(() => import('./pages/QuestionDetail'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-canvas px-5 text-center">
      <div>
        <h1 className="text-2xl font-bold text-ink-heading">Page not found</h1>
        <p className="mt-2 text-sm text-ink-muted">That route is not available.</p>
        <Link to="/" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">Go home</Link>
      </div>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="grid min-h-svh place-items-center text-sm text-ink-muted" role="status">Loading page…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/questions" element={<QuestionBank />} />
            <Route path="/questions/:questionId" element={<QuestionDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
