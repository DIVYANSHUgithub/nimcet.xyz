import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import Container from './ui/Container'
import Button from './ui/Button'
import { cn } from '../lib/cn'
import Toast from './Toast'
import { useAuth } from '../context/useAuth'

const navLinks = [
  { label: 'Questions', to: '/questions' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const [notice, setNotice] = useState('')
  const menuButtonRef = useRef(null)
  const isLoginPage = pathname === '/login'
  const isSignupPage = pathname === '/signup'
  const isQuestionsPage =
    pathname === '/questions' || pathname.startsWith('/questions/')

  const linkClass = (active) =>
    cn(
      'text-sm font-medium text-ink-muted transition-colors hover:text-ink-heading',
      active && 'font-semibold text-ink-heading'
    )

  const showUnavailable = (feature) => {
    setMenuOpen(false)
    setNotice(`${feature} are not available in this project yet.`)
  }

  const handleSignOut = async () => {
    setMenuOpen(false)
    try {
      await signOut()
      setNotice('You have been signed out.')
    } catch (error) {
      console.error('Sign out failed:', error)
      setNotice(error.message || 'Unable to sign out right now.')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas">
      <Container className="flex h-[3.75rem] items-center justify-between gap-4">
        <Link
          to="/"
          className="shrink-0 text-[0.9375rem] font-bold tracking-wide text-ink-heading"
        >
          NIMCET.XYZ
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {navLinks.map((link) =>
            link.to ? (
              <Link
                key={link.label}
                to={link.to}
                className={linkClass(isQuestionsPage && link.label === 'Questions')}
                aria-current={
                  isQuestionsPage && link.label === 'Questions' ? 'page' : undefined
                }
              >
                {link.label}
              </Link>
            ) : null
          )}
          <button type="button" className={`${linkClass(false)} border-0 bg-transparent`} onClick={() => showUnavailable('Previous-year questions')}>PYQs</button>
          <button type="button" className={`${linkClass(false)} border-0 bg-transparent`} onClick={() => showUnavailable('Tests')}>Tests</button>
          <Link to="/#about" className={linkClass(false)}>About</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/questions"
            className="hidden size-9 items-center justify-center rounded-sm text-ink-muted hover:bg-canvas-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:inline-flex"
            aria-label="Search"
          >
            <Search size={20} />
          </Link>
          {user ? (
            <button type="button" onClick={handleSignOut} className="hidden min-h-9 rounded-md px-3 text-sm font-medium text-ink-muted hover:bg-canvas-muted hover:text-ink-heading md:inline-flex md:items-center" title={`Signed in as ${user.email || 'user'}`}>Sign out</button>
          ) : isLoginPage ? (
            <span
              className="inline-flex min-h-9 items-center rounded-md border border-ink-heading bg-canvas-muted px-3 text-[0.8125rem] font-semibold text-ink-heading"
              aria-current="page"
            >
              Login
            </span>
          ) : (
            <Button as={Link} to="/login" variant="ghost" size="sm">
              Login
            </Button>
          )}
          {!user && isSignupPage ? (
            <span
              className="hidden min-h-9 items-center rounded-md border border-brand bg-brand px-4 text-[0.8125rem] font-medium text-white md:inline-flex"
              aria-current="page"
            >
              Sign Up
            </span>
          ) : !user ? (
            <Link to="/signup" className="hidden min-h-9 items-center rounded-md border border-brand bg-brand px-4 text-[0.8125rem] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:inline-flex">
              Sign Up
            </Link>
          ) : null}
          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-sm text-ink-heading hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <nav
          className="flex flex-col border-t border-line px-5 pb-4 md:hidden"
          aria-label="Mobile navigation"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setMenuOpen(false)
              menuButtonRef.current?.focus()
            }
          }}
        >
          {navLinks.map((link) =>
            link.to ? (
              <Link
                key={link.label}
                to={link.to}
                className="border-b border-line py-3 text-[0.9375rem] font-medium text-ink"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ) : null
          )}
          <button type="button" className="border-b border-line py-3 text-left text-[0.9375rem] font-medium text-ink" onClick={() => showUnavailable('Previous-year questions')}>PYQs (unavailable)</button>
          <button type="button" className="border-b border-line py-3 text-left text-[0.9375rem] font-medium text-ink" onClick={() => showUnavailable('Tests')}>Tests (unavailable)</button>
          <Link to="/#about" className="border-b border-line py-3 text-[0.9375rem] font-medium text-ink" onClick={() => setMenuOpen(false)}>About</Link>
          {!user && !isLoginPage && (
            <Link
              to="/login"
              className="border-b border-line py-3 text-[0.9375rem] font-medium text-ink"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
          )}
          {!user && !isSignupPage && (
            <Link
              to="/signup"
              className="py-3 text-[0.9375rem] font-medium text-ink"
              onClick={() => setMenuOpen(false)}
            >
              Sign Up
            </Link>
          )}
          {user && <button type="button" onClick={handleSignOut} className="py-3 text-left text-[0.9375rem] font-medium text-ink">Sign out</button>}
        </nav>
      )}
      <Toast message={notice} onDismiss={() => setNotice('')} />
    </header>
  )
}
