import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Search, UserRound, X } from 'lucide-react'
import Container from './ui/Container'
import Button from './ui/Button'
import { authLinkTo, isNavActive } from '../lib/navigation'
import { cn } from '../lib/cn'
import Toast from './Toast'
import { useAuth } from '../context/useAuth'

const navLinks = [
  { label: 'Questions', to: '/questions' },
  { label: 'Tests', to: '/tests' },
  { label: 'PYQ', to: '/pyq' },
  { label: 'My results', to: '/results' },
  { label: 'About', to: '/about' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { pathname } = location
  const { user, signOut } = useAuth()
  const [notice, setNotice] = useState('')
  const menuButtonRef = useRef(null)
  const isLoginPage = pathname === '/login'
  const isSignupPage = pathname === '/signup'

  const linkClass = (active) =>
    cn(
      'text-sm font-medium text-ink-muted transition-colors hover:text-ink-heading',
      active && 'font-semibold text-ink-heading'
    )

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
                className={linkClass(isNavActive(pathname, link.to))}
                aria-current={
                  isNavActive(pathname, link.to) ? 'page' : undefined
                }
              >
                {link.label}
              </Link>
            ) : null
          )}
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
            <>
              <Button as={Link} to="/profile" size="sm" variant="ghost" aria-current={isNavActive(pathname, '/profile') ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
                <UserRound size={16} aria-hidden="true" /> Profile
              </Button>
              <button type="button" onClick={handleSignOut} className="hidden min-h-9 rounded-md px-3 text-sm font-medium text-ink-muted hover:bg-canvas-muted hover:text-ink-heading md:inline-flex md:items-center">Sign out</button>
            </>
          ) : isLoginPage ? (
            <span
              className="inline-flex min-h-9 items-center rounded-md border border-ink-heading bg-canvas-muted px-3 text-[0.8125rem] font-semibold text-ink-heading"
              aria-current="page"
            >
              Login
            </span>
          ) : (
            <Button as={Link} to={authLinkTo('/login', location)} variant="ghost" size="sm">
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
            <Link to={authLinkTo('/signup', location)} className="hidden min-h-9 items-center rounded-md border border-brand bg-brand px-4 text-[0.8125rem] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:inline-flex">
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
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <nav
          className="flex flex-col border-t border-line px-5 pb-4 md:hidden"
          id="mobile-navigation"
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
                aria-current={isNavActive(pathname, link.to) ? 'page' : undefined}
                className="border-b border-line py-3 text-[0.9375rem] font-medium text-ink"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ) : null
          )}
          {!user && !isLoginPage && (
            <Link
              to={authLinkTo('/login', location)}
              className="border-b border-line py-3 text-[0.9375rem] font-medium text-ink"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
          )}
          {!user && !isSignupPage && (
            <Link
              to={authLinkTo('/signup', location)}
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
