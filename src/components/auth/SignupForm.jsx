import { useState } from "react";
import { Link } from "react-router-dom";
import SocialSignup from "./SocialSignup";

const Icon = ({ children }) => (
  <svg className="su-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const icons = {
  user: <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Icon>,
  mail: <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>,
  at: <Icon><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></Icon>,
  lock: <Icon><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>,
};
const EyeIcon = ({ off }) => (
  <svg className="su-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const initial = { fullName: "", email: "", username: "", password: "", confirmPassword: "" };

function validate(v) {
  const e = {};
  if (!v.fullName.trim()) e.fullName = "Enter your full name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = "Enter a valid email address.";
  if (!v.username.trim()) e.username = "Choose a username.";
  if (!v.password) e.password = "Create a password.";
  else if (v.password.length < 6) e.password = "Password must be at least 6 characters.";
  if (!v.confirmPassword) e.confirmPassword = "Confirm your password.";
  else if (v.confirmPassword !== v.password) e.confirmPassword = "Passwords do not match.";
  return e;
}

export default function SignupForm() {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState({ password: false, confirmPassword: false });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setNotice("");
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setLoading(true);
    // Frontend only: no account is created and nothing is stored.
    setTimeout(() => {
      setLoading(false);
      setNotice("Account creation will be connected when authentication is added.");
    }, 600);
  };

  const field = (name, label, placeholder, icon, opts = {}) => {
    const isPw = opts.password;
    const id = `su-${name}`;
    const err = errors[name];
    const describedBy = [err && `${id}-err`, opts.hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
    return (
      <div className="su-field">
        <label htmlFor={id}>{label}</label>
        <div className={`su-input${err ? " su-input--error" : ""}`}>
          {icons[icon]}
          <input
            id={id} name={name} value={values[name]} onChange={onChange}
            type={isPw ? (show[name] ? "text" : "password") : opts.type || "text"}
            placeholder={placeholder} autoComplete={opts.autoComplete}
            aria-invalid={!!err} aria-describedby={describedBy}
          />
          {isPw && (
            <button type="button" className="su-eye" onClick={() => setShow((s) => ({ ...s, [name]: !s[name] }))}
              aria-label={show[name] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={show[name]}>
              <EyeIcon off={!show[name]} />
            </button>
          )}
        </div>
        {err && <p className="su-error" id={`${id}-err`} role="alert">{err}</p>}
        {opts.hint && !err && <p className="su-hint" id={`${id}-hint`}>{opts.hint}</p>}
      </div>
    );
  };

  return (
    <section className="su-left" aria-labelledby="su-title">
      <h1 id="su-title">Create Your Account</h1>
      <p className="su-sub">Join NIMCET.XYZ and take your preparation to the next level.</p>

      <form onSubmit={onSubmit} noValidate>
        {field("fullName", "Full Name", "Enter your full name", "user", { autoComplete: "name" })}
        {field("email", "Email Address", "Enter your email address", "mail", { type: "email", autoComplete: "email" })}
        {field("username", "Username", "Choose a username", "at", { autoComplete: "username" })}
        {field("password", "Password", "Create a password", "lock", { password: true, autoComplete: "new-password", hint: "Must be at least 6 characters" })}
        {field("confirmPassword", "Confirm Password", "Confirm your password", "lock", { password: true, autoComplete: "new-password" })}

        <button type="submit" className="su-primary" disabled={loading}>
          {loading ? "Creating account…" : "Create Account"}
        </button>
        {notice && <p className="su-notice" role="status">{notice}</p>}
      </form>

      <SocialSignup />

      <p className="su-login">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </section>
  );
}