import { Link } from 'react-router-dom'
import LegalLayout from '../components/legal/LegalLayout'
import Section from '../components/legal/LegalSection'
import Email from '../components/legal/LegalEmail'
import OperatorDetails from '../components/legal/OperatorDetails'

const sections = [
  ['agreement', 'Acceptance and operator'], ['platform', 'Independent educational service'],
  ['accounts', 'Accounts and sign-in'], ['free', 'Free resources and mock tests'],
  ['paid', 'Paid services and access'], ['refunds', 'Payments, refunds and cancellation'],
  ['content', 'Content and intellectual property'], ['conduct', 'Acceptable use and integrity'],
  ['results', 'Attempts, answers and results'], ['availability', 'Availability and responsibility'],
  ['termination', 'Suspension and account closure'], ['privacy', 'Privacy'],
  ['law', 'Consumer rights and governing law'], ['complaints', 'Contact and complaints'],
  ['changes', 'Changes to these terms'],
]

export default function Terms() {
  return <LegalLayout path="/terms" intro="These terms explain the conditions for using NIMCET.XYZ accounts, educational resources and mock tests." sections={sections}>
    <Section id="agreement" title="Acceptance and operator">
      <p>By using NIMCET.XYZ, you agree to these terms insofar as a valid agreement can be formed under applicable law. If you do not agree, stop using the service. Any separate purchase conditions must be made available before you pay.</p>
      <p>The platform is operated by the following individual, not a registered company, LLP or private limited company:</p><OperatorDetails />
    </Section>
    <Section id="platform" title="Independent educational service">
      <p>NIMCET.XYZ provides question practice, mock tests and learning performance information for NIMCET preparation. It is independent and is not affiliated with, endorsed by or an official service of NIMCET examination authorities or participating institutions.</p>
      <p>Practice material and mock results are educational aids. We do not guarantee admission, a particular rank, marks or examination success. Check official examination sources for eligibility, syllabus, dates and admission requirements.</p>
    </Section>
    <Section id="accounts" title="Accounts and sign-in">
      <p>Provide accurate account information and keep your credentials secure. Do not share accounts or impersonate others. Tell us if you suspect misuse. You are responsible for your use of the account, subject to applicable protections for unauthorised activity.</p>
      <p>Email/password and social sign-in are handled by Supabase Auth. Google and, where enabled, GitHub authenticate you under their own terms. We do not ask for your Google password. Provider restrictions or revoked access may affect sign-in; contact us if you cannot access your learning records.</p>
      <p>If you are under 18 or otherwise cannot enter a binding agreement, involve a parent or lawful guardian and obtain any consent required by law before providing information or using account-based services. The application does not currently verify age or parental consent.</p>
    </Section>
    <Section id="free" title="Free resources and mock tests">
      <p>Public question resources may be browsed without an account. Mock tests and personal results require sign-in. Free access does not imply unlimited attempts: a test may have availability dates, a time limit, an attempt limit and a result-release policy shown in the application.</p>
      <p>The current application provides no integrated payment checkout. Its test access checks use publication status, visibility or ownership, availability and attempt limits; they do not currently implement paid purchase entitlements.</p>
    </Section>
    <Section id="paid" title="Paid services and access">
      <p>If paid mock tests or courses are introduced, the offer must identify the included tests or content, total price and applicable charges, access duration, attempt limits, activation conditions, payment provider and refund or cancellation conditions before payment. Do not make a payment based only on these general terms.</p>
      <p>A purchase grants only the access described in that offer. Buying one paid test or course does not automatically grant unlimited attempts, lifetime access, or access to every paid service. Free and paid content must be clearly distinguished when paid services become available. These terms do not themselves create a subscription or recurring payment mandate.</p>
    </Section>
    <Section id="refunds" title="Payments, refunds and cancellation">
      <p>There is no payment processor integrated into the current application. A future checkout must identify its processor and terms before requesting payment. Never send passwords, payment authentication codes, full card details or UPI PINs to support.</p>
      <p>If a payment fails, is duplicated, or an amount is debited without the purchased access being authorised, email <Email subject="Payment or access issue" /> with the transaction reference, date, amount and affected test or course. We will review the payment and access status and the appropriate correction, reversal or refund. A failed payment without a debit does not create an amount to refund.</p>
      <p>After successful payment and course or test access authorisation, refund requests are reviewed individually. A refund is not automatically guaranteed or automatically excluded. The operator has not yet established detailed eligibility criteria, a request window, processing timelines or cancellation conditions; those conditions must be settled and displayed before paid sales begin.</p>
      <p>No “all payments are non-refundable” rule applies through these terms. Remedies required by applicable consumer law, including for deficient services or misleading descriptions, remain available regardless of access authorisation. There is currently no recurring subscription to cancel.</p>
    </Section>
    <Section id="content" title="Content and intellectual property">
      <p>You may use the question bank, explanations, images and mock tests for your personal learning. Rights in original platform content belong to the operator or relevant licensors. Third-party and examination material remains subject to its owners’ rights; inclusion does not imply official endorsement or transfer of ownership.</p>
      <p>Do not bulk scrape, systematically download, sell, republish or commercially redistribute the question bank or bypass content access controls without permission. This does not restrict uses permitted by law. Report suspected copyright errors with the relevant page and evidence of your rights to <Email subject="Content rights concern" />.</p>
    </Section>
    <Section id="conduct" title="Acceptable use and integrity">
      <ul><li>Do not access another person’s records, steal credentials or bypass authentication or access restrictions.</li><li>Do not exploit vulnerabilities, disrupt tests, overload the service, upload malicious content or misuse administrative tools.</li><li>Do not manipulate scores, automate attempts to falsify performance, or present mock results as official examination results.</li><li>Do not distribute restricted test answers or use the platform to facilitate cheating in an official assessment.</li><li>Do not send unlawful, abusive or unnecessary sensitive information through support or content tools.</li></ul>
      <p>Report security issues privately by email with enough detail to investigate, without accessing or disclosing other users’ information.</p>
    </Section>
    <Section id="results" title="Attempts, answers and results">
      <p>Test timing, marking rules, attempt limits and result or answer release depend on the test configuration. The server’s saved answers and deadline determine evaluation. Unsaved changes may be lost during network or browser failures. Check save feedback and use the available synchronisation controls when needed.</p>
      <p>Submitted results reflect a practice attempt, not an official rank or admission decision. Content and scoring errors may occur. Send the attempt reference, question identifier and a clear explanation to support for review. We do not promise that a submitted attempt can always be reopened or its stored results edited.</p>
    </Section>
    <Section id="availability" title="Availability and responsibility">
      <p>We aim to provide a useful and reliable service, but maintenance, network failures and third-party outages can interrupt access. We may update or withdraw resources for legitimate operational, legal or content-quality reasons. Any effect on purchased access must be addressed under the purchase terms and applicable consumer law.</p>
      <p>Use reasonable care with your device and internet connection. Our responsibility for service failures is determined by applicable law and any valid purchase terms. These terms do not impose a blanket exclusion of liability or remove responsibility that cannot lawfully be excluded.</p>
    </Section>
    <Section id="termination" title="Suspension and account closure">
      <p>Access may be restricted to protect security, investigate misuse, comply with law or address a material breach of these terms. Restrictions should be proportionate. Where appropriate and legally permitted, we will explain the reason and allow you to raise a concern by email. Purchased-service remedies remain subject to applicable law.</p>
      <p>You can stop using the service and request account closure at <Email subject="Account closure request" />. Closure and deletion require review; linked test results, legal obligations and provider retention can affect removal. See the <Link to="/privacy-policy#retention">Privacy Policy’s retention information</Link>.</p>
    </Section>
    <Section id="privacy" title="Privacy"><p>The <Link to="/privacy-policy">Privacy Policy</Link> describes account, test, technical and support information, service providers and privacy requests. Accepting these terms does not replace any separate consent required by law.</p></Section>
    <Section id="law" title="Consumer rights and governing law">
      <p>These terms are governed by the laws of India, subject to mandatory protections that apply to you. Nothing here removes rights or remedies under the Consumer Protection Act, 2019, applicable e-commerce rules or other laws that cannot be waived.</p>
      <p>You may use competent consumer commissions, courts or other statutory complaint mechanisms as permitted by law. Contacting us first can help resolve an issue, but is not a condition that prevents you from exercising a legal remedy. No exclusive court location is imposed by these terms.</p>
    </Section>
    <Section id="complaints" title="Contact and complaints"><p>For account, test, payment, refund or other complaints, email <Email subject="Complaint concerning NIMCET.XYZ" /> or see <Link to="/contact">Contact Us</Link>. The operator’s details appear above. The support email is not represented as a formally appointed statutory Grievance Officer.</p></Section>
    <Section id="changes" title="Changes to these terms"><p>Updates will appear here with a revised last-updated date. Material changes will be communicated as required by law. Changes do not retrospectively remove accrued consumer rights or alter a completed purchase contrary to applicable law.</p></Section>
  </LegalLayout>
}
