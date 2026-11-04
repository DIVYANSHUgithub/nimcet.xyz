import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ClipboardList, FileQuestion, Timer } from 'lucide-react'
import Toast from './Toast'

const unavailable = [
  { label: 'Previous year questions', icon: FileQuestion, message: 'Previous-year questions are not included in the published dataset.' },
  { label: 'Quizzes', icon: ClipboardList, message: 'A quiz engine is not available yet.' },
  { label: 'Mock tests', icon: Timer, message: 'Mock tests are not available yet.' },
]

export default function QuickStart() {
  const [notice, setNotice] = useState('')
  return (
    <>
      <aside className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink-heading">Quick start</h2>
        <p className="mb-3 mt-1 text-sm text-ink-muted">Choose a study area.</p>
        <ul className="divide-y divide-line">
          <li><Link to="/questions" className="flex min-h-12 items-center gap-3 py-2 text-sm font-medium text-ink-heading hover:text-brand"><Archive size={18} className="text-ink-muted" />Question bank</Link></li>
          {unavailable.map(({ label, icon: Icon, message }) => <li key={label}><button type="button" className="flex min-h-12 w-full items-center gap-3 py-2 text-left text-sm font-medium text-ink-heading hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setNotice(message)}><Icon size={18} className="text-ink-muted" />{label}<span className="ml-auto text-xs font-normal text-ink-muted">Unavailable</span></button></li>)}
        </ul>
      </aside>
      <Toast message={notice} onDismiss={() => setNotice('')} />
    </>
  )
}
