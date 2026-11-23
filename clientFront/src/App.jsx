import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ConnectionStatus from './components/ConnectionStatus'
import AppBoundary from './components/AppBoundary'
import { RequireSession, RouteAccessibility } from './components/RouteAccess'
import { AuthProvider } from './context/AuthContext'
import OAuthReturn from './components/OAuthReturn'
import DeviceSessionNotice from './components/DeviceSessionNotice'

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const QuestionBank = lazy(() => import('./pages/QuestionBank'))
const QuestionDetail = lazy(() => import('./pages/QuestionDetail'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const TestCatalog = lazy(() => import('./pages/TestCatalog'))
const TestAttempt = lazy(() => import('./pages/TestAttempt'))
const AttemptResult = lazy(() => import('./pages/AttemptResult'))
const StudentResults = lazy(() => import('./pages/StudentResults'))
const PYQ = lazy(() => import('./pages/PYQ'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const Terms = lazy(() => import('./pages/Terms'))
const Contact = lazy(() => import('./pages/Contact'))
const StudentPass = lazy(() => import('./pages/StudentPass'))
const Profile = lazy(() => import('./pages/Profile'))

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
    <AppBoundary><BrowserRouter>
      <AuthProvider>
        <OAuthReturn />
        <RouteAccessibility />
        <ConnectionStatus />
        <DeviceSessionNotice />
        <Suspense fallback={<div className="grid min-h-svh place-items-center text-sm text-ink-muted" role="status">Loading page…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/questions" element={<QuestionBank />} />
            <Route path="/questions/:questionId" element={<QuestionDetail />} />
            <Route path="/tests" element={<TestCatalog />} />
            <Route path="/student-pass" element={<StudentPass />} />
            <Route path="/profile" element={<RequireSession><Profile /></RequireSession>} />
            <Route path="/attempts/:attemptId" element={<RequireSession><TestAttempt /></RequireSession>} />
            <Route path="/attempts/:attemptId/result" element={<RequireSession><AttemptResult /></RequireSession>} />
            <Route path="/pyq" element={<PYQ />} />
            <Route path="/results" element={<StudentResults />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter></AppBoundary>
  )
}

export default App
