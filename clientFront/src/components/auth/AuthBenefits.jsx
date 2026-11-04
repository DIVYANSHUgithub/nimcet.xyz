import { KeyRound, LockKeyhole, RotateCcw } from 'lucide-react'

const authFeatures = [
  { icon: KeyRound, text: 'Email and password sign in' },
  { icon: LockKeyhole, text: 'Password recovery by email' },
  { icon: RotateCcw, text: 'Session restored across visits' },
]

export default function AuthBenefits({ title, Illustration }) {
  return (
    <aside className="bg-canvas-muted p-6 lg:bg-surface lg:p-10">
      <Illustration />
      <h2 className="mb-2 text-center text-xl font-bold tracking-tight text-ink-heading lg:text-left">{title}</h2>
      <p className="mb-5 text-center text-sm leading-6 text-ink-muted lg:text-left">Email/password accounts are available. The Question Bank is public; quizzes, bookmarks, and progress tracking are not implemented yet.</p>
      <ul className="space-y-3">
        {authFeatures.map(({ icon: Icon, text }) => <li key={text} className="flex items-center gap-3 text-sm font-medium text-ink-heading"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-muted"><Icon size={16} aria-hidden="true" /></span>{text}</li>)}
      </ul>
    </aside>
  )
}
