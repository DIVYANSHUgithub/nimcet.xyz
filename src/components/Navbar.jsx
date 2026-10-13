import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'

const navLinks = [
  { label: 'Questions', to: '/questions' },
  { label: 'PYQs', href: '/#pyqs' },
  { label: 'Tests', href: '/#tests' },
  { label: 'About', href: '/#about' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const isLoginPage = pathname === '/login'
  const isSignupPage = pathname === '/signup'
  const isQuestionsPage =
    pathname === '/questions' || pathname.startsWith('/questions/')

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__logo">
          NIMCET.XYZ
        </Link>

        <nav className="navbar__links" aria-label="Main navigation">
          {navLinks.map((link) =>
            link.to ? (
              <Link
                key={link.label}
                to={link.to}
                className={`navbar__link ${isQuestionsPage && link.label === 'Questions' ? 'navbar__link--active' : ''}`}
                aria-current={isQuestionsPage && link.label === 'Questions' ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="navbar__link">
                {link.label}
              </a>
            )
          )}
        </nav>

        <div className="navbar__actions">
          <button type="button" className="navbar__icon-btn" aria-label="Search">
            <Search size={20} />
          </button>
          {isLoginPage ? (
            <span className="btn btn--ghost navbar__login navbar__login--active" aria-current="page">
              Login
            </span>
          ) : (
            <Link to="/login" className="btn btn--ghost navbar__login">
              Login
            </Link>
          )}
          {isSignupPage ? (
            <span className="btn btn--primary navbar__signup" aria-current="page">
              Sign Up
            </span>
          ) : (
            <Link to="/signup" className="btn btn--primary navbar__signup">
              Sign Up
            </Link>
          )}
          <button
            type="button"
            className="navbar__menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="navbar__mobile" aria-label="Mobile navigation">
          {navLinks.map((link) =>
            link.to ? (
              <Link
                key={link.label}
                to={link.to}
                className="navbar__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="navbar__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            )
          )}
          {!isLoginPage && (
            <Link
              to="/login"
              className="navbar__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
