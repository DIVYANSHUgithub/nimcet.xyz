const footerLinks = [
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Terms', href: '#terms' },
]

function GithubIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.01.28-2.09 0-3.1 0 0-1 0-3 1.5a10.3 10.3 0 0 0-5 0C6 5 5 5 5 5c-.3 1.15-.3 2.35 0 3.5A4.8 4.8 0 0 0 4 12c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 20.5 9 22" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

function YoutubeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  )
}

function XIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <span className="footer__logo">NIMCET.XYZ</span>
          <p className="footer__tagline">A free platform for NIMCET aspirants.</p>
        </div>
        <div className="footer__links">
          <nav className="footer__nav" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <a key={link.label} href={link.href} className="footer__link">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="footer__social">
            <a href="#github" aria-label="GitHub" className="footer__social-link">
              <GithubIcon />
            </a>
            <a href="#youtube" aria-label="YouTube" className="footer__social-link">
              <YoutubeIcon />
            </a>
            <a href="#x" aria-label="X (Twitter)" className="footer__social-link">
              <XIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
