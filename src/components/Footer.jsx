import { Link } from 'react-router-dom'
import Container from './ui/Container'

const footerLinks = [
  { label: 'About', to: '/#about' },
  { label: 'Question Bank', to: '/questions' },
  { label: 'Log in', to: '/login' },
  { label: 'Sign up', to: '/signup' },
]

export default function Footer() {
  return (
    <footer id="about" className="mt-auto border-t border-line bg-surface py-9">
      <Container className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/" className="text-[0.9375rem] font-bold tracking-wide text-ink-heading">NIMCET.XYZ</Link>
          <p className="mt-1 text-xs text-ink-muted">Question practice for NIMCET aspirants.</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation">
          {footerLinks.map((link) => <Link key={link.label} to={link.to} className="text-xs text-ink-muted transition-colors hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{link.label}</Link>)}
        </nav>
        <p className="text-xs text-ink-muted">Social profiles are not configured.</p>
      </Container>
    </footer>
  )
}
