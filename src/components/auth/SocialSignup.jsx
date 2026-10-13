import { useState } from "react";

const Google = () => (
  <svg className="su-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4Z" />
    <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23.5Z" />
    <path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3Z" />
    <path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.700l3.300-3.300A11.500 11.500 0 0 0 1.800 6.800l3.800 3C6.500 7.400 9 5.400 12 5.400Z" />
  </svg>
);
const GitHub = () => (
  <svg className="su-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.200.7-3.900-1.400-3.900-1.400-.5-1.300-1.300-1.700-1.300-1.700-1-.7.100-.7.100-.7 1.200.1 1.800 1.200 1.800 1.200 1 1.800 2.700 1.300 3.400 1 .1-.8.400-1.300.7-1.600-2.600-.3-5.300-1.300-5.300-5.700 0-1.300.5-2.300 1.200-3.100-.1-.3-.5-1.500.1-3.100 0 0 1-.3 3.200 1.200a11 11 0 0 1 5.800 0c2.200-1.500 3.200-1.200 3.200-1.200.6 1.600.2 2.800.1 3.100.8.800 1.200 1.800 1.200 3.100 0 4.400-2.700 5.400-5.300 5.700.4.400.8 1.100.8 2.200v3.200c0 .3.2.7.8.600A11.500 11.500 0 0 0 12 .5Z" />
  </svg>
);

export default function SocialSignup() {
  const [msg, setMsg] = useState("");
  const soon = () => setMsg("Social signup will be available soon.");
  return (
    <div className="su-social">
      <div className="su-or" role="separator"><span>OR</span></div>
      <button type="button" className="su-outline" onClick={soon}><Google /> Continue with Google</button>
      <button type="button" className="su-outline" onClick={soon}><GitHub /> Continue with GitHub</button>
      {msg && <p className="su-notice" role="status">{msg}</p>}
    </div>
  );
}