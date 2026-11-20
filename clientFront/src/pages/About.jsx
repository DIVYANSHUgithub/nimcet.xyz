import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpen, ChartNoAxesColumnIncreasing, ClipboardList, History } from 'lucide-react'
import PageShell from '../components/ui/PageShell'
import Button from '../components/ui/Button'
import { aboutPage } from '../lib/about'
import { legalDetails } from '../lib/legal'

const studyTools = [
  {
    to: '/questions',
    title: 'Question bank',
    description: 'Choose a subject or topic, try a question, and use the explanation to revisit the method.',
    icon: BookOpen,
  },
  {
    to: '/pyq',
    title: 'Previous-year questions',
    description: 'Browse questions by exam year or take an available past paper as a timed test.',
    icon: History,
  },
  {
    to: '/tests',
    title: 'Mock tests',
    description: 'Practise working under a time limit and get used to moving between questions during a test.',
    icon: ClipboardList,
  },
  {
    to: '/results',
    title: 'My results',
    description: 'Sign in to see your attempt history, review released scores and compare your test performance.',
    icon: ChartNoAxesColumnIncreasing,
  },
]

const textLink = 'inline-flex min-h-10 items-center gap-2 rounded-sm text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent'

export default function About() {
  return <PageShell>
    <meta name="description" content={aboutPage.description} />
    <link rel="canonical" href={`${legalDetails.origin}${aboutPage.to}`} />
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-5 pb-12 pt-8 sm:pb-16 md:px-8 md:pt-12">
      <header className="rounded-xl border border-info-border bg-linear-to-br from-info-bg to-canvas px-6 py-9 sm:px-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-ink-heading sm:text-5xl">About NIMCET.XYZ</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink sm:text-lg">
          NIMCET.XYZ is an independent study platform for students preparing for the NIT MCA Common Entrance Test. Practise one topic at a time, work through past questions, and test your pacing when you’re ready.
        </p>
        <Button as={Link} to="/questions" className="mt-6">Start practising <ArrowRight size={16} aria-hidden="true" /></Button>
      </header>

      <section className="mt-10 sm:mt-12" aria-labelledby="about-study-tools">
        <h2 id="about-study-tools" className="text-2xl font-bold tracking-tight text-ink-heading">Study tools</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {studyTools.map(({ to, title, description, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="group flex h-full items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-info-border hover:bg-info-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-4 sm:p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-info-bg text-accent">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink-heading">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-ink-muted group-hover:text-accent" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-5 border-t border-line pt-6 sm:mt-12 sm:grid-cols-2 sm:gap-8 sm:pt-8">
        <section aria-labelledby="about-support">
          <h2 id="about-support" className="text-lg font-bold text-ink-heading">Site support</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            {legalDetails.operatorName} operates NIMCET.XYZ. Contact support to report a question error or get help with an account, test or result.
          </p>
          <Link to="/contact" className={textLink}>Contact us <ArrowRight size={15} aria-hidden="true" /></Link>
        </section>
        <section aria-labelledby="about-exam">
          <h2 id="about-exam" className="text-lg font-bold text-ink-heading">Official exam information</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Check the official portal for exam dates, eligibility, applications and counselling notices.
          </p>
          <a href="https://nimcet.admissions.nic.in/" className={textLink}>Official NIMCET portal <ArrowUpRight size={15} aria-hidden="true" /></a>
        </section>
      </div>
    </main>
  </PageShell>
}
