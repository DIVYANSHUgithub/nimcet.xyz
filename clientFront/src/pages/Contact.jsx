import { Link, useLocation } from 'react-router-dom'
import { authLinkTo } from '../lib/navigation'
import LegalLayout from '../components/legal/LegalLayout'
import Section from '../components/legal/LegalSection'
import Email from '../components/legal/LegalEmail'
import OperatorDetails from '../components/legal/OperatorDetails'

const sections = [
  ['support', 'General support'], ['account', 'Account and login'], ['google', 'Google sign-in'],
  ['questions', 'Question bank'], ['tests', 'Mock tests'], ['scores', 'Results and scores'],
  ['payments', 'Payments and refunds'], ['privacy', 'Privacy and deletion'], ['complaints', 'Complaints and grievances'],
]

export default function Contact() {
  const location = useLocation()
  return <LegalLayout path="/contact" intro="Email the individual operator of NIMCET.XYZ for support, privacy requests or complaints. You do not need to sign in to find these contact details." sections={sections}>
    <p className="rounded-xl border border-line bg-canvas-muted p-5">Official support email: <Email />. The links below open your email app; no message is submitted through this page. Do not send passwords, authentication tokens, OTPs, UPI PINs or full card details. Redact personal information in screenshots.</p>
    <Section id="support" title="General support"><p>Email <Email subject="General support" /> with a short description of your issue and the relevant page URL. NIMCET.XYZ is operated by an individual:</p><OperatorDetails /></Section>
    <Section id="account" title="Account and login problems"><p>Use <Email subject="Account or login issue" />. Include the registered email address, sign-in method and error message. Use the password reset option on the <Link to={authLinkTo('/login', location)}>login page</Link> if appropriate. Support will never need your password.</p></Section>
    <Section id="google" title="Google sign-in problems"><p>Email <Email subject="Google sign-in issue" /> with the error text, the time it occurred and whether you were using a personal or managed Google account. Do not send sign-in links, OAuth callback URLs, authorisation codes or tokens. If a screenshot includes these, remove them first.</p></Section>
    <Section id="questions" title="Question bank problems"><p>Send the question URL or identifier and a description to <Email subject="Question bank issue" />. For a suspected answer error, explain your reasoning or reference. For a content rights concern, identify the content and your rights in it.</p></Section>
    <Section id="tests" title="Mock test problems"><p>Email <Email subject="Mock test issue" /> with the test title, attempt reference, approximate time and what went wrong. Mention any save or connection error. Do not include passwords or session data. Keep a record of the issue if it affects a timed attempt.</p></Section>
    <Section id="scores" title="Test result and score problems"><p>Contact <Email subject="Result or score review" /> with the attempt reference, question identifier if relevant, expected outcome and your explanation. We will review the issue; a request does not guarantee that a submitted result can be changed.</p></Section>
    <Section id="payments" title="Payment and refund problems"><p>Check your order on the <Link to="/student-pass">Student Pass page</Link>. If your payment succeeded and your pass hasn’t activated, or you were charged twice, email <Email subject="Payment or refund issue" /> with the order reference, date and amount. An admin reviews refund requests. See the <Link to="/terms#refunds">payment and refund terms</Link>.</p></Section>
    <Section id="privacy" title="Privacy and data deletion requests"><p>Email <Email subject="Privacy or data deletion request" /> from your registered email where possible, stating whether you want access, correction, account closure or deletion. We may need proportionate identity verification. There is no self-service deletion tool, and linked results, lawful retention and provider backups may affect removal. See the <Link to="/privacy-policy">Privacy Policy</Link> for details. Parents and guardians may use this contact for child privacy concerns.</p></Section>
    <Section id="complaints" title="Complaints and grievances"><p>Send a complaint to <Email subject="Complaint or grievance" /> with the relevant account or transaction reference, a concise description and the resolution you seek. Avoid unnecessary personal documents. This is the operator’s support and complaint channel; no statutory Grievance Officer appointment is represented here.</p><p>You retain applicable consumer and other statutory remedies. This contact process does not prevent you from using them. We do not promise a response time that has not been established; any applicable legal deadlines remain binding.</p></Section>
  </LegalLayout>
}
