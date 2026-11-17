import { Link } from 'react-router-dom'
import LegalLayout from '../components/legal/LegalLayout'
import Section from '../components/legal/LegalSection'
import Email from '../components/legal/LegalEmail'
import OperatorDetails from '../components/legal/OperatorDetails'

const sections = [
  ['operator', 'Who operates this platform'], ['information', 'Information we collect'],
  ['google', 'Google and other sign-in options'], ['technical', 'Technical data and browser storage'],
  ['purposes', 'How we use information'], ['providers', 'Providers and sharing'],
  ['payments', 'Payment information'], ['security', 'Storage and security'],
  ['retention', 'Retention'], ['rights', 'Your choices and deletion requests'],
  ['children', 'Children and consent'], ['links', 'External links'],
  ['changes', 'Policy changes'], ['contact', 'Privacy complaints and contact'],
]

export default function PrivacyPolicy() {
  return <LegalLayout path="/privacy-policy" intro="This policy explains how information is handled when you visit NIMCET.XYZ, create an account, practise questions or take mock tests." sections={sections}>
    <Section id="operator" title="Who operates this platform">
      <p>NIMCET.XYZ is an independent educational platform operated by an individual, not a registered company. In this policy, “we”, “us” and “our” refer to that individual operator. For privacy questions, email <Email />.</p>
      <OperatorDetails />
    </Section>
    <Section id="information" title="Information we collect">
      <h3>Account information</h3>
      <p>For email registration, you provide your full name, email address, optional username and password. Supabase Auth handles the password and authentication records. With social sign-in, Supabase receives the identity and profile information provided by the sign-in provider, which may include your name, email, profile picture URL and provider account identifier.</p>
      <p>Account records include a Supabase user ID, linked authentication identities, verification status, creation and sign-in timestamps, and account metadata. Where account administration features are enabled, authorised administrators can view limited account details and manage roles or account status.</p>
      <h3>Learning and test information</h3>
      <p>We process question searches, filters and question identifiers to provide practice content. Mock tests store the test and version you attempt, selected answers, visited questions, review flags, current position, timestamps, deadlines, submission status, scores and section results. These records support test history and performance summaries. A practice answer displayed in your browser is not necessarily saved as a test attempt.</p>
      <h3>Support and administration</h3>
      <p>If you email us, we receive your address, message and any attachments you choose to send. Administrative actions may record actor IDs, affected records, reasons, changes and request identifiers in audit logs. Please send only information necessary to resolve your issue.</p>
    </Section>
    <Section id="google" title="Google and other sign-in options">
      <p>Google Sign-In uses Supabase Auth to identify you and link your learning records to your account. The current Google sign-in request uses the basic permissions <code>email</code> and <code>profile</code>. This can supply your Google account identifier, name, email and profile picture URL. The application does not add further Google permissions. The Google consent screen shows the permissions requested for your sign-in.</p>
      <p>Google identity and profile information is stored in Supabase authentication records and included in your application session. Relevant account identifiers are processed by our backend to authorise access. We use this information for authentication, account management and related support; we do not use Google data for advertising, sell it or use it for unrelated purposes. We do not request access to Gmail messages, Drive files, contacts or calendars through this application.</p>
      <p>Google receives sign-in requests and related technical information under <a href="https://policies.google.com/privacy">Google’s Privacy Policy</a>. You can remove the connection in your <a href="https://myaccount.google.com/connections">Google account connections</a>. Revoking Google access does not by itself delete your NIMCET.XYZ records.</p>
      <p>The interface also offers GitHub sign-in through Supabase. If you choose it and the provider is enabled, GitHub supplies the identity, email and profile information permitted by its sign-in flow. See <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub’s Privacy Statement</a>.</p>
    </Section>
    <Section id="technical" title="Technical data and browser storage">
      <p>Supabase’s browser client normally persists session information, including authentication tokens, in local storage so you can remain signed in. Tokens are sent to Supabase and, where required, our backend to authenticate requests. Signing out or clearing site storage removes local session state; clearing storage does not delete server records and can interrupt a test.</p>
      <p>Our backend records request IDs, methods, URL paths, response status and duration for operations and troubleshooting. Browser errors may also be written to the browser console. Hosting, authentication and other service providers receive connection information such as IP addresses, browser or user-agent details, request times and requested resources, and may maintain their own security or access logs.</p>
      <p>The application does not currently integrate an advertising tracker or an external analytics SDK. Performance summaries are based on your test records. Local storage is distinct from cookies; authentication providers or infrastructure may use cookies on their own services. Browser settings can control cookies and site storage, but blocking required authentication storage may prevent sign-in.</p>
    </Section>
    <Section id="purposes" title="How we use information">
      <ul><li>Create and authenticate accounts, restore sessions and apply access permissions.</li><li>Deliver questions, save and evaluate test attempts, and show results and learning progress.</li><li>Provide support, investigate disputed results and maintain content quality.</li><li>Protect accounts, prevent misuse, troubleshoot failures and maintain service reliability.</li><li>Meet applicable legal requirements and address legitimate complaints or disputes.</li></ul>
      <p>Providing account information is necessary to use account-based features. You can browse public resources without creating an account. We do not treat this policy alone as consent to unrelated processing.</p>
    </Section>
    <Section id="providers" title="Providers and sharing">
      <ul><li><strong>Supabase:</strong> authentication, user and session records, database records including attempts and scores, and question media storage where configured. See <a href="https://supabase.com/privacy">Supabase’s Privacy Policy</a>.</li><li><strong>Google and GitHub:</strong> identity verification when you select their sign-in option.</li><li><strong>Vercel:</strong> website hosting and delivery, receiving page requests and connection information. See <a href="https://vercel.com/legal/privacy-policy">Vercel’s Privacy Policy</a>.</li><li><strong>Backend hosting:</strong> the server handling application API requests receives the data needed for those requests, including authentication tokens and answers. Its hosting infrastructure may retain operational logs.</li><li><strong>Google Fonts:</strong> the site requests the Inter font from Google’s font servers, which receive your IP address and request headers. See <a href="https://developers.google.com/fonts/faq/privacy">Google Fonts privacy information</a>.</li><li><strong>Email services:</strong> messages to our Gmail support address are processed by Google and your email provider.</li></ul>
      <p>Access by the operator and authorised administrators is for operating and supporting the platform. Information may also be disclosed when required by law or reasonably necessary to investigate abuse, protect rights or resolve a dispute, subject to applicable safeguards. Test histories are not published as a public leaderboard by the current application.</p>
    </Section>
    <Section id="payments" title="Payment information">
      <p>The current application has no integrated payment checkout, subscription system or purchase-entitlement records. Do not send card details, UPI PINs or bank credentials to us. If paid services are introduced, the payment provider, information processed and purchase conditions must be disclosed before collection or payment, and this policy updated.</p>
    </Section>
    <Section id="security" title="Storage and security">
      <p>Account and learning records are held in Supabase. Service providers may process data in India or other countries according to their infrastructure and arrangements; we do not promise India-only storage for every service or backup. Access controls, authenticated backend requests and database row-level security help limit access. No internet service or storage method can guarantee complete security.</p>
      <p>Educational images may be publicly accessible. Do not include personal information in material intended for publication. Keep your account secure and contact us if you suspect unauthorised access.</p>
    </Section>
    <Section id="retention" title="Retention">
      <p>Account and test records remain available for ongoing account access, test history and service operations unless removed through an appropriate process. The application does not implement an automatic age-based deletion schedule. We have not established a single fixed retention period covering accounts, test history, support messages, logs and backups.</p>
      <p>Retention depends on the record’s purpose, applicable law, disputes and provider settings. Submitted tests and linked results have database restrictions that can prevent a simple account deletion. Some administrative records can remain after an account identifier is removed. Backup and infrastructure log copies may remain until the provider’s retention cycle completes. We cannot promise immediate removal of every copy.</p>
    </Section>
    <Section id="rights" title="Your choices and deletion requests">
      <p>Email <Email subject="Privacy or account deletion request" /> from your registered email address to request access, correction, account closure or deletion, or to raise an objection or withdraw consent where applicable. State the request and affected account without sending a password or token. We may ask for proportionate verification to protect your account.</p>
      <p>There is currently no self-service account deletion control. We will review the request, explain any lawful retention requirement or technical limitation, and identify the available next steps. Signing out, uninstalling a browser or revoking a provider connection does not delete database records. Stopping necessary account processing may mean that account-based services can no longer be provided.</p>
      <p>Your legal rights depend on the law and provisions in force. India’s Digital Personal Data Protection Act, 2023 and Rules, 2025 have phased commencement; this policy does not represent every future statutory right as already in force. Applicable existing rights and complaint remedies remain available.</p>
    </Section>
    <Section id="children" title="Children and consent">
      <p>NIMCET preparation may interest younger learners. If you are under 18, involve a parent or lawful guardian before providing personal information or using account-based services, and contact us where consent is required. The current application does not verify age or parental consent; this notice is not a substitute for any legally required consent process.</p>
      <p>A parent or guardian concerned about a child’s information can email <Email subject="Child privacy concern" />. We will review the concern and appropriate restriction or deletion steps. We do not knowingly use children’s information for targeted advertising.</p>
    </Section>
    <Section id="links" title="External links"><p>Links to external websites lead to services with their own policies and security practices. Review their policies before providing information.</p></Section>
    <Section id="changes" title="Policy changes"><p>We will update this page and its last-updated date when practices change. Material changes requiring notice or consent will be handled as applicable law requires. Review this policy alongside our <Link to="/terms">Terms of Service</Link>.</p></Section>
    <Section id="contact" title="Privacy complaints and contact"><p>Send privacy questions, correction requests, deletion requests and complaints to <Email />. Include enough context to identify the issue. See <Link to="/contact">Contact Us</Link> for support guidance. This email is the operator’s support and privacy contact; it is not presented as an appointed statutory Grievance Officer.</p></Section>
  </LegalLayout>
}
