import { useState } from 'react'
import { BookOpen, ChevronDown, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import Container from '../components/ui/Container'
import PageShell from '../components/ui/PageShell'
import { legalDetails } from '../lib/legal'
import { examPattern, guideHeading, official, publishedSeatTotals, reviewedOn, seatCategories, seatPrograms, syllabus, testCentres } from './aboutNimcetData'

const canonicalUrl = `${legalDetails.origin}/about-nimcet`
const imagePath = '/about-nimcet-marks.webp'
const imageUrl = legalDetails.origin + imagePath
const imageAlt = 'NIMCET 2026 marks by subject: Mathematics 600, Logical Reasoning 240, Computer Awareness 120 and English 40, out of 1,000.'
const siteAuthor = { '@type': 'Organization', name: 'NIMCET.XYZ', url: `${legalDetails.origin}/about` }
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      '@id': `${canonicalUrl}#guide`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      headline: guideHeading,
      image: [imageUrl],
      dateModified: reviewedOn,
      inLanguage: 'en-IN',
      author: siteAuthor,
      publisher: siteAuthor,
      citation: [official.brochure, official.syllabus, official.seats, official.counselling],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${legalDetails.origin}/` },
        { '@type': 'ListItem', position: 2, name: guideHeading, item: canonicalUrl },
      ],
    },
  ],
}

const sectionLinks = [
  ['pattern', 'Exam pattern'],
  ['eligibility', 'Eligibility'],
  ['syllabus', 'Syllabus'],
  ['colleges', 'Colleges & seats'],
  ['ranking', 'Ranking'],
  ['admissions', 'Application & fees'],
  ['preparation', 'Preparation'],
  ['faq', 'FAQs'],
  ['sources', 'Official sources'],
]

const linkStyle = 'font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent'
const subheading = 'text-lg font-semibold text-ink-heading'
const tableCell = 'px-3 py-2.5'
const rowHeading = `sticky left-0 z-10 w-[9rem] min-w-[9rem] max-w-[9rem] bg-surface text-left font-semibold sm:min-w-52 sm:max-w-52 ${tableCell}`
const sum = (values) => values.reduce((total, value) => total + value, 0)
const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

function GuideSection({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-32 space-y-3 border-b border-line py-7 lg:scroll-mt-20">
      <h2 id={`${id}-heading`} className="text-2xl font-bold tracking-tight text-ink-heading">{title}</h2>
      {children}
    </section>
  )
}

function Disclosure({ title, children }) {
  return (
    <details className="group border-b border-line last:border-b-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 font-semibold text-ink-heading hover:bg-canvas-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown size={18} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4 pt-1">{children}</div>
    </details>
  )
}

function GuideTable({ title, headers, children, footer, freezeColumn = false }) {
  return (
    <div tabIndex={0} role="region" aria-label={title} className="overflow-x-auto rounded-lg border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <table className="w-full border-collapse bg-surface text-left text-sm tabular-nums">
        <caption className="sr-only">{title}</caption>
        <thead className="border-b border-line bg-canvas-muted text-ink-heading">
          <tr>{headers.map((label, index) => (
            <th key={label} scope="col" className={`${tableCell} whitespace-nowrap ${freezeColumn && index === 0 ? 'sticky left-0 z-20 bg-canvas-muted' : ''}`}>{label}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
        {footer && <tfoot className="border-t border-line bg-canvas-muted font-semibold text-ink-heading">{footer}</tfoot>}
      </table>
    </div>
  )
}

function InstituteMatrix() {
  const [query, setQuery] = useState('')
  const terms = query.toLowerCase().trim().split(/\s+/)
  const results = seatPrograms.filter(([name, , , aliases = '']) => {
    const searchText = `${name} ${aliases}`.toLowerCase()
    return terms.every(term => searchText.includes(term))
  })
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="w-full sm:max-w-xs">
          <label htmlFor="nimcet-institute" className="block text-sm font-semibold text-ink-heading">Search participating institutes</label>
          <div className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 focus-within:ring-2 focus-within:ring-accent">
            <Search size={17} aria-hidden="true" className="shrink-0 text-ink-muted" />
            <input id="nimcet-institute" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, city or program" className="w-full min-w-0 bg-transparent py-2 text-base text-ink-heading outline-none" />
          </div>
        </div>
        <p className="text-sm text-ink-muted" role="status">{results.length} of {seatPrograms.length} program and campus entries</p>
      </div>
      <GuideTable title="Official NIMCET 2026 all-India seat matrix" headers={['Institute / program', 'Total', ...seatCategories]} freezeColumn footer={
        <tr>
          <th scope="row" className={`${rowHeading} bg-canvas-muted`}>Published totals</th>
          <td className={tableCell}>{sum(publishedSeatTotals).toLocaleString('en-IN')}</td>
          {publishedSeatTotals.map((value, index) => <td key={seatCategories[index]} className={tableCell}>{value}</td>)}
        </tr>
      }>
        {results.map(([name, seats]) => (
          <tr key={name}>
            <th scope="row" className={rowHeading}>{name}</th>
            <td className={`${tableCell} font-semibold`}>{sum(seats)}</td>
            {seats.map((value, index) => <td key={seatCategories[index]} className={tableCell}>{value}</td>)}
          </tr>
        ))}
        {results.length === 0 && <tr><td colSpan={12} className="px-3 py-4">No matching institutes. Try a shorter search.</td></tr>}
      </GuideTable>
    </div>
  )
}

export default function AboutNimcet() {
  return (
    <PageShell>
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="article:modified_time" content={reviewedOn} />
      <main id="main-content" tabIndex={-1}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
        <article id="guide">
          <header className="border-b border-line bg-gradient-to-br from-info-bg via-canvas to-canvas">
            <Container className="py-6 sm:py-9">
              <nav className="mb-4 text-sm text-ink-muted" aria-label="Breadcrumb">
                <Link className={linkStyle} to="/">Home</Link><span aria-hidden="true" className="mx-2">/</span><span aria-current="page">{guideHeading}</span>
              </nav>
              <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,.72fr)] lg:gap-10">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-ink-heading sm:text-5xl">{guideHeading}</h1>
                  <p className="mt-3 max-w-2xl text-base text-ink">
                    The <strong>NIT MCA Common Entrance Test (NIMCET)</strong> is a national exam for admission to Master of Computer Applications programs at participating NITs and IIITs. Your exam rank is used in centralised counselling to allocate seats.
                  </p>
                  <p className="mt-3 text-sm text-ink-muted">Reviewed by NIMCET.XYZ on <time dateTime={reviewedOn}>28 November 2026</time></p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button as="a" href="#syllabus" variant="monochrome" size="sm"><BookOpen size={16} aria-hidden="true" /> Explore the syllabus</Button>
                    <Button as="a" href={official.brochure} variant="secondary" size="sm">Official 2026 brochure</Button>
                  </div>
                </div>
                <img src={imagePath} alt={imageAlt} width={1200} height={630} className="w-full max-w-xl rounded-xl" />
              </div>
              <dl aria-label="NIMCET 2026 at a glance" className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-4">
                {[['120', 'Questions'], ['120 min', 'Test duration'], ['1,000', 'Maximum marks'], ['13', 'Participating institutes']].map(([value, label]) => (
                  <div key={label} className="flex flex-col-reverse border-line px-3 py-2.5 odd:border-r [&:nth-child(-n+2)]:border-b sm:border-r sm:last:border-r-0 sm:[&:nth-child(-n+2)]:border-b-0">
                    <dt className="text-sm text-ink-muted">{label}</dt><dd className="text-xl font-bold tabular-nums text-ink-heading">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-ink">
                <strong>NIMCET 2027 update.</strong> The <a className={linkStyle} href={official.portal}>official portal</a> still showed the 2026 session at review. The figures below are for 2026. Check the portal for the 2027 notification and see our <Link className={linkStyle} to="/nimcet-2027">2027 preparation guide</Link> in the meantime.
              </p>
            </Container>
          </header>

          <Container className="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-8">
            <nav aria-label="On this page" className="sticky top-[61px] z-30 -mx-5 overflow-x-auto border-b border-line bg-canvas md:-mx-8 lg:top-16 lg:z-auto lg:mx-0 lg:self-start lg:overflow-visible lg:border-0 lg:py-7">
              <p className="mb-2 hidden text-sm font-bold text-ink-heading lg:block">On this page</p>
              <ul className="flex w-max gap-1 px-5 py-1 md:px-8 lg:w-auto lg:flex-col lg:px-0 lg:py-0">
                {sectionLinks.map(([id, label]) => (
                  <li key={id}><a href={`#${id}`} className="flex min-h-10 items-center rounded-md px-2 text-sm font-medium text-ink hover:bg-canvas-muted hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent lg:min-h-9">{label}</a></li>
                ))}
              </ul>
            </nav>
            <div className="min-w-0 pb-6 text-base leading-relaxed text-ink">
              <GuideSection id="pattern" title="NIMCET 2026 exam pattern and marking scheme">
                <p>NIT Tiruchirappalli coordinated the 2026 exam, held on 6 June from 2 to 4 p.m. IST. The computer-based test used four-option questions in English and three fixed parts. Once a part ended, candidates could not return to it.</p>
                <GuideTable title="NIMCET 2026 questions, marks and section times" headers={['Subject', 'Questions', 'Correct', 'Wrong', 'Max marks', 'Time']}>
                  {examPattern.map(({ id, subject, questions, time, correct, wrong, marks }) => (
                    <tr key={id}>
                      <th scope="row" className={`${tableCell} min-w-40 font-semibold`}>{subject}</th>
                      <td className={tableCell}>{questions}</td><td className={tableCell}>+{correct}</td>
                      <td className={tableCell}>−{wrong}</td><td className={tableCell}>{marks}</td>
                      {time && <td className={`${tableCell} whitespace-nowrap`} rowSpan={id === 'computers' ? 2 : 1}>{time}</td>}
                    </tr>
                  ))}
                </GuideTable>
                <p>Every wrong answer cost 25% of the marks available for that question. Unanswered questions scored zero. See the <Link className={linkStyle} to="/nimcet-2026">2026 exam archive</Link> for the cycle’s official documents.</p>
              </GuideSection>

              <GuideSection id="eligibility" title="NIMCET 2026 eligibility criteria">
                <p>Indian nationals could apply with a recognised B.E. or B.Tech. degree, or an undergraduate program of at least three years that included Mathematics or Statistics as a subject.</p>
                <GuideTable title="2026 qualifying degree marks by category" headers={['Candidate category', 'Aggregate', 'CGPA out of 10']}>
                  <tr><th scope="row" className={`${tableCell} font-semibold`}>Standard minimum</th><td className={tableCell}>60%</td><td className={tableCell}>6.5</td></tr>
                  <tr><th scope="row" className={`${tableCell} font-semibold`}>SC, ST or PwD</th><td className={tableCell}>55%</td><td className={tableCell}>6.0</td></tr>
                </GuideTable>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Count all subjects across all years, including optional and additional subjects. The brochure barred conversion between percentage and CGPA, and used proportional scaling for CGPA on scales other than 10.</li>
                  <li>Final-year applicants could apply with the certificate from their institution in Annexure V. Proof of eligibility was due at counselling or admission and by 30 September 2026 at the latest.</li>
                  <li>The same degree length and subject rules applied to open-university programs. The brochure required UGC or AICTE approval and Distance Education Council approval.</li>
                  <li>For admission through central counselling, candidates also needed a NIMCET 2026 rank.</li>
                </ul>
              </GuideSection>

              <GuideSection id="syllabus" title="Revised NIMCET syllabus">
                <p>Open a subject to see all topic groups in the <a className={linkStyle} href={official.syllabus}>official syllabus effective from 2026</a>. Check the 2027 notice for any changes.</p>
                <div className="overflow-hidden rounded-lg border border-line bg-surface">
                  {examPattern.map(({ id, subject, questions }) => (
                    <Disclosure key={id} title={`${subject} · ${questions} questions`}>
                      <dl className="space-y-3">
                        {syllabus[id].map(([topic, explanation]) => (
                          <div key={topic}><dt className="font-semibold text-ink-heading">{topic}</dt><dd>{explanation}</dd></div>
                        ))}
                      </dl>
                    </Disclosure>
                  ))}
                </div>
              </GuideSection>

              <GuideSection id="colleges" title="Participating colleges and official seat matrix">
                <p>The 2026 matrix lists <strong>1,300 seats</strong> across <strong>11 NITs and 2 IIITs</strong>. Separate rows identify campuses, specialisations and self-financing options. The quota was all-India, with no separate state quota.</p>
                <p className="text-sm text-ink-muted">Scroll the table sideways for all reservation categories.</p>
                <InstituteMatrix />
                <p className="text-sm text-ink-muted">The <a className={linkStyle} href={official.seats}>official seat matrix</a> lists 93 ST, 125 EWS, 9 ST–PwD and 6 EWS–PwD seats in its totals row. The published program rows add up to 94, 124, 8 and 7 for those columns, respectively. Both give 1,300 seats overall. Use the official counselling portal for the seat availability in a specific round.</p>
                <h3 className={subheading}>Reservation and cutoffs</h3>
                <p>Open means open competition. The matrix shows seats for Other Backward Classes (OBC), Scheduled Castes (SC), Scheduled Tribes (ST) and the Economically Weaker Section (EWS), with a separate PwD column for each category, including Open. Reservation follows Government of India rules.</p>
                <div className="overflow-hidden rounded-lg border border-line bg-surface">
                  <Disclosure title="2026 category certificates and special-round rules">
                    <ul className="list-disc space-y-2 pl-5">
                      <li>OBC-NCL applicants needed central-list and non-creamy-layer proof plus a signed undertaking. OBC-NCL and Open-EWS certificates needed to be issued from 1 April 2025 for the application and from 1 April 2026 for the original shown at admission.</li>
                      <li>SC, ST and PwD applicants used the relevant certificate formats. See the <a className={linkStyle} href={official.annexures}>official certificate annexures</a>.</li>
                      <li>In the special round, vacant PwD seats could return to their parent category. The guidelines also allowed vacant EWS and OBC seats to transfer to Open under the conversion rules. See the <a className={linkStyle} href={official.counselling}>e-counselling guidelines</a> for the sequence.</li>
                    </ul>
                  </Disclosure>
                </div>
                <p>Compare the <a className={linkStyle} href={official.ranks}>official opening and closing ranks</a> by institute, category and round. For program and fee notices, use the <a className={linkStyle} href={official.institutes}>participating institute directory</a>.</p>
              </GuideSection>

              <GuideSection id="ranking" title="How NIMCET ranks and ties were decided">
                <p>Candidates needed positive marks in both Mathematics and the overall exam to receive a rank. The four subject scores were added to give a weighted total out of 1,000. Higher totals ranked first.</p>
                <h3 className={subheading}>Tie-break order</h3>
                <ol className="list-decimal space-y-1 pl-6">
                  <li>Higher Mathematics score.</li>
                  <li>Higher Analytical Ability and Logical Reasoning score.</li>
                  <li>Higher Computer Awareness score.</li>
                  <li>Older candidate.</li>
                  <li>Computerised random selection if the tie still remained.</li>
                </ol>
              </GuideSection>

              <GuideSection id="admissions" title="Application, counselling, centres and fees">
                <h3 className={subheading}>From application to admission</h3>
                <ol className="list-decimal space-y-2 pl-6">
                  <li><strong>Register and apply.</strong> Register through the official portal, enter your personal and academic details, choose three test cities, upload your photo, signature, ID and relevant certificates, then pay and save the submitted form.</li>
                  <li><strong>Take the exam.</strong> Download the admit card and report with the printed card and the ID used to apply. The admit card states your allotted centre and reporting instructions.</li>
                  <li><strong>Fill counselling choices.</strong> Download your rank card. If qualified, register for counselling and order and lock your institute and program choices.</li>
                  <li><strong>Respond to an allotment.</strong> Allocation uses rank, choices, category and seat availability. Follow the official instructions for payment and document verification. Float keeps you in consideration for a higher preference. Freeze keeps your current choice. Withdrawal gives up the allotted seat.</li>
                  <li><strong>Complete admission.</strong> Pay the required amount and report to the allotted institute with original documents. In 2026, a special round followed three general rounds, with separate participation and choice-filling rules.</li>
                </ol>
                <p>Use the <a className={linkStyle} href={official.schedule}>official schedule</a> for dates and the <a className={linkStyle} href={official.counselling}>e-counselling guidelines</a> for eligibility, fees, refunds and deadlines by round.</p>
                <div className="overflow-hidden rounded-lg border border-line bg-surface">
                  <Disclosure title="2026 exam centres and city codes">
                    <p>The brochure published {testCentres.length} tentative cities. Candidates ranked three preferences. The allotted centre could differ from their choices and could not be changed on request.</p>
                    <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2 xl:grid-cols-3">
                      {testCentres.map((city, index) => <li key={city}><span className="mr-2 font-semibold tabular-nums text-ink-muted">{index + 11}</span>{city}</li>)}
                    </ul>
                  </Disclosure>
                </div>
                <h3 className={subheading}>2026 fees</h3>
                <GuideTable title="NIMCET 2026 application and counselling fees" headers={['Stage', 'Published amount']}>
                  {[
                    ['Exam application (non-refundable)', '₹2,500 for Open, Open-EWS and OBC. ₹1,250 for SC, ST and PwD in any category.'],
                    ['General counselling registration', '₹1,000 (non-refundable).'],
                    ['Seat acceptance', '₹10,000 after allotment.'],
                    ['Additional partial admission', '₹30,000 for General, General-EWS and OBC-NCL. ₹20,000 for SC, ST and PwD in any category.'],
                    ['Special-round participation', '₹10,000 for previously registered candidates. ₹11,000 for fresh registration.'],
                  ].map(([stage, amount]) => <tr key={stage}><th scope="row" className={`${tableCell} min-w-36 font-semibold`}>{stage}</th><td className={tableCell}>{amount}</td></tr>)}
                </GuideTable>
                <div className="overflow-hidden rounded-lg border border-line bg-surface">
                  <Disclosure title="2026 institute fees by program">
                    <p>The brochure lists consolidated fees for NIT Agartala and labels NIT Tiruchirappalli’s amount as subject to revision. Other figures are tuition only. Check each institute’s current notice for hostel charges and other fees.</p>
                    <GuideTable title="2026 MCA semester fees by institute and program" headers={['Institute / program', 'Published semester fees']}>
                      {seatPrograms.map(([name, , fee]) => (
                        <tr key={name}><th scope="row" className={`${tableCell} min-w-40 font-semibold`}>{name}</th>
                          <td className={tableCell}>{Array.isArray(fee) ? fee.map(amount => rupees.format(amount)).join(' · ') + ' (Semesters 1–6)' : `${rupees.format(fee)} each semester`}</td></tr>
                      ))}
                    </GuideTable>
                  </Disclosure>
                </div>
              </GuideSection>

              <GuideSection id="preparation" title="NIMCET preparation strategy and PYQs">
                <ol className="list-decimal space-y-2 pl-6">
                  <li><strong>Start with a baseline.</strong> Try a past paper and record weak areas against the revised syllabus. Mathematics carried 60% of the marks in 2026, so give it regular practice time.</li>
                  <li><strong>Practise by topic.</strong> Use the <Link className={linkStyle} to="/questions">NIMCET question bank</Link>, review worked solutions and retry missed questions after a few days.</li>
                  <li><strong>Use PYQs to learn the format.</strong> <Link className={linkStyle} to="/pyq">Previous-year questions</Link> show how concepts are tested. Compare older papers with the revised syllabus before using them as a checklist.</li>
                  <li><strong>Rehearse the section timers.</strong> Take a <Link className={linkStyle} to="/pyq?view=tests">timed past paper</Link> or use the <Link className={linkStyle} to="/tests">NIMCET mock test series</Link>. Track accuracy and skipped questions separately so you can decide what to revisit.</li>
                </ol>
              </GuideSection>

              <GuideSection id="faq" title="NIMCET frequently asked questions">
                <div className="overflow-hidden rounded-lg border border-line bg-surface">
                  <Disclosure title="Who conducts NIMCET?"><p>A participating NIT coordinates the exam. NIT Tiruchirappalli was the coordinator for the 2026 session.</p></Disclosure>
                  <Disclosure title="When is the NIMCET 2027 exam?"><p>The <a className={linkStyle} href={official.portal}>official NIMCET portal</a> still showed the 2026 session when this guide was reviewed on 28 November 2026. Check it for confirmed 2027 application and exam dates.</p></Disclosure>
                  <Disclosure title="Can BCA and final-year students apply?"><p>Under the 2026 rules, a BCA could qualify if it met the three-year, Mathematics or Statistics, and aggregate requirements. Final-year students were eligible subject to proof of candidature and completion by the prescribed deadline.</p></Disclosure>
                  <Disclosure title="Does NIMCET have negative marking?"><p>Yes. In 2026, the deduction was 25% of each incorrect question’s value. The penalty was 3 marks in Mathematics, 1.5 in Reasoning and Computer Awareness, and 1 in English. Skipped questions scored zero.</p></Disclosure>
                  <Disclosure title="How many colleges and seats were there in NIMCET 2026?"><p>There were 13 participating institutes and 1,300 published seats. The <a className={linkStyle} href="#colleges">seat matrix</a> separates campus and self-financing options.</p></Disclosure>
                  <Disclosure title="Is there a single NIMCET cutoff?"><p>A positive Mathematics score and positive overall score were required for a 2026 rank. Admission closing ranks varied by institute, category, program and counselling round.</p></Disclosure>
                </div>
              </GuideSection>

              <GuideSection id="sources" title="Official NIMCET resources">
                <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {[
                    ['NIMCET admissions portal', official.portal], ['2026 information brochure', official.brochure],
                    ['Revised syllabus', official.syllabus], ['2026 seat matrix', official.seats],
                    ['Exam and counselling schedule', official.schedule], ['E-counselling guidelines', official.counselling],
                    ['Participating institutes', official.institutes], ['Opening and closing ranks', official.ranks],
                    ['Category certificate forms', official.annexures],
                  ].map(([title, url]) => <li key={url}><a className={linkStyle} href={url}>{title}</a></li>)}
                </ul>
              </GuideSection>
            </div>
          </Container>
        </article>
      </main>
    </PageShell>
  )
}
