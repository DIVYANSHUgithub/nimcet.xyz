# Legal publication checklist — 18 November 2026

Implementation is locally complete. Publication has not been authorised or performed. These pages do not establish full legal compliance. Resolve applicable mandatory disclosures before publishing; do not treat absent information as an exemption. Paid sales need additional work beyond these pages.

## Operator facts supplied in this chat

- Operator: Divyanshu Mishra, an individual, not a registered company.
- Address: Netaram Chauraha, Prayagraj, Uttar Pradesh 211002, India. The operator supplied the address; its adequacy as a principal geographic/contact address has not been legally assessed.
- Email: nimcet.xyz@gmail.com.
- Refund direction: payment failures and similar issues should be addressed; requests after successful payment and course authorisation will be reviewed. No fixed period, processing deadline or detailed post-activation criteria were supplied.

Public identity/contact text is centralised in `clientFront/src/lib/legal.js`. Unresolved configuration fields are explicitly `null` in `docs/legal-operator-decisions.json`; that file is not shipped as application configuration or rendered on public pages.

## Before publication: operator and professional review

- [ ] Assess the platform's current activities, including any sales or off-platform collections, against the Consumer Protection Act and E-Commerce Rules. Being an individual does not automatically exempt the operator.
- [ ] Determine whether a statutory grievance appointment/disclosure is required now. If required, make the appointment and supply the person's name, designation, contact information and operating complaint procedure. The supplied operator identity does not itself establish appointment. Replace the pages' support-only grievance explanation with verified disclosures before publication where required.
- [ ] Confirm the supplied address is suitable and sufficiently complete for required geographic disclosures. Supply customer-care telephone/contact information where required; do not invent a number.
- [ ] Assess current IT Act section 43A/SPDI Rules applicability, especially password authentication handled through Supabase. Confirm consent, privacy notice, reasonable security, transfer and grievance arrangements. Do not assume that an individual or sole proprietor falls outside the statutory definition of body corporate.
- [ ] Confirm actual backend host, production configuration, email handling, provider contracts/subprocessors, international processing and log/backup settings. Vercel frontend hosting is operator-supplied context and supported by configuration, not a verified deployment account inspection. `render.yaml` is a preview configuration, not evidence of the production backend host.
- [ ] Confirm notice delivery and account-registration acceptance/consent requirements. Adding links does not establish recorded acceptance or valid consent. Authentication logic was intentionally left intact.
- [ ] Review child access and contractual capacity now; plan age/parental-consent handling before relevant DPDP duties commence. The app currently has no age gate or verifiable parental-consent workflow. Do not claim an educational exemption without assessing its conditions.
- [ ] Establish retention periods and a documented access/correction/deletion process. Rehearse deletion on synthetic data with submitted attempts and results, provider sessions, retained audit JSON, media objects, backups and restored backups. Do not test deletion on production users.
- [ ] Confirm original and third-party question/image licensing and procedures for rights complaints.

## Before accepting any paid purchase

- [ ] Disclose any existing manual/off-platform payment arrangement so the policy can be corrected if one exists.
- [ ] Select and verify the payment provider, merchant arrangement, payment data flow, transaction records and retention.
- [ ] Define concrete refund eligibility for failed/duplicate debits and missing access; distinguish reversals, restoration of access and refunds. Establish post-authorisation review criteria, request window, refund method, decision and processing timelines, cancellation terms and complaint escalation, subject to statutory remedies.
- [ ] Display total pricing/charges, exact included content, access duration, attempt limits, activation conditions and refund terms before payment. The present terms are not a complete paid offer.
- [ ] Implement checkout and server-enforced purchase entitlements separately. This repository currently has neither; test visibility and attempt limits are not a paid entitlement system.
- [ ] Review tax/invoicing, consumer disclosure and recordkeeping duties. Keep essential purchase evidence without inventing retention periods.

## Law checked at the implementation date

Primary sources below were consulted online on 18 November 2026. Applicability to this operator needs professional assessment; the following is an implementation research record, not a legal opinion.

### DPDP Act and Rules: phased commencement

The [Act commencement notification, G.S.R. 843(E)](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf) specifies three phases. The initial institutional provisions began on publication in November 2025. Section 6(9) and section 27(1)(d) begin one year later. Most substantive processing duties and rights, including sections 3–17 subject to the stated section 6 exception, begin eighteen months later. The corresponding calculated dates are 13 November 2026 and 13 May 2027, respectively. Thus the core rights/duties should not be described as all currently in force on this review date. Section 44(2), including the IT Act section 43A omission, is in the eighteen-month phase.

The [DPDP Rules, G.S.R. 846(E), rule 1](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf) brings rules 1, 2 and 17–21 into force on publication; rule 4 after one year; and rules 3, 5–16, 22 and 23 after eighteen months. These calculate to 13 November 2025, 13 November 2026 and 13 May 2027. Notice, security, erasure, child consent and rights handling require preparation before the later phase; no blanket small-operator or education exemption is assumed.

The [December 2025 corrigendum, G.S.R. 892(E)](https://www.meity.gov.in/static/uploads/2025/12/3c7ebbae0e5456f493f486e6845df86b.pdf) corrects wording, including the commencement reference to publication in the Official Gazette; it does not substitute new phase lengths.

Search also identified an October 2026 Removal of Difficulties Order, S.O. 5458(E), concerning sections 9 and 10. Its official Gazette PDF could not be retrieved in this session. Have counsel verify that instrument and any subsequent amendments or judicial orders before publication; its operative text is not represented here as independently verified. Public pages therefore describe phased commencement generally rather than asserting exhaustive current-law compliance.

### Existing IT/privacy framework

The [IT Amendment Act, 2008, official government-hosted text](https://cdnbbsr.s3waas.gov.in/s3ec037a4bf9ba2bd774068ad50351fb89/uploads/2023/06/2023060286.pdf) includes sole proprietorships and certain commercial/professional associations in section 43A's body-corporate definition. The [SPDI Rules at WIPO](https://www.wipo.int/wipolex/en/legislation/details/15063) and [Government clarification](https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=74990) are relevant to assessment. Privacy policy and grievance duties cannot be dismissed merely because the operator is not incorporated. Counsel should confirm the applicable current requirements, outsourcing arrangements, and transition to DPDP.

### Consumer and e-commerce rules

The [E-Commerce Rules, 2020, government copy](https://thc.nic.in/Central%20Governmental%20Rules/Consumer%20Protection%20%28E-Commerce%29%20Rules%2C%202020.pdf) include disclosure and grievance duties. Rule 4(4) requires applicable entities to appoint and disclose a grievance officer; rule 4(5) provides 48-hour acknowledgement and one-month redressal. These are statutory requirements where applicable, not invented support promises. The [2021 amendment](https://consumeraffairs.gov.in/public/upload/files/Consumer%20Protection%20%28E-Commerce%29%20%28Amendment%29%20Rules%2C%202021_1732704241.pdf) replaces rule 4(1) with a nodal-officer requirement for specified organisational forms; it is not a general exemption from the other rules for individual operators.

The [2026 amendment, G.S.R. 789(E)](https://consumeraffairs.gov.in/public/upload/files/E%20Commerce%20Amendment%20Rules%202026_1789128659.pdf) expressly commences on **1 January 2027**, so its new provisions are upcoming at this review date. Where applicable, prepare for revised complaint/disclosure requirements, National Consumer Helpline convergence, sponsored-listing and price disclosures, and annual dark-pattern self-audit/certificate duties. Counsel should identify which provisions apply to this single-operator educational service, rather than importing marketplace-only rules indiscriminately.

The terms preserve mandatory consumer remedies, avoid blanket non-refundability, do not promise admissions/results, and do not impose an exclusive forum. These drafting choices do not substitute for the operational duties above.

### Google policies and production checks

The [OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies) and [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) require truthful branding, data-use disclosure and appropriate permissions. The code adds no extra scopes; a read-only live authorisation redirect confirmed `email profile`. [Supabase's documented Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) also describes `openid` and email/profile permissions; the policy names the actual observed request instead of assuming that documented defaults are identical to the hosted request.

Google Cloud audience/publishing/verification state was not inspected. According to [Google's current app-state documentation](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview), External Testing ordinarily uses an allowlist capped at 100 test users, with an exception for basic identity scopes. [Google's audience guidance](https://support.google.com/cloud/answer/15549945?hl=en-KI) also describes seven-day authorisation expiry and the basic-profile exception. Do not automatically claim that all non-test users are blocked or every basic-profile session expires after seven days. Confirm actual console settings and Workspace administrator restrictions. Do not bypass verification.

- [ ] After approved deployment, confirm the home, privacy and terms URLs in an unauthenticated browser, with real HTTPS and no preview access gate.
- [ ] Enter `https://nimcet.xyz`, `https://nimcet.xyz/privacy-policy` and `https://nimcet.xyz/terms` in Google Auth Platform Branding.
- [ ] Verify a complete Google consent/return flow using an authorised test account, plus signup/email confirmation, recovery and sign-out. The read-only authorisation redirect check is not an end-to-end login.
- [ ] Complete real desktop/tablet/mobile and keyboard visual QA. Browser automation was unavailable during this task. Confirm no overflow, header overlap or console errors in the deployed environment.
- [ ] Repeat hosted tests/questions/admin acceptance against the intended backend and verify the unchanged feature flags. Do not enable pending features just to make a policy statement true.
