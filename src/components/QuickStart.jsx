import { useState } from 'react'
import {
  Archive,
  BookOpen,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  Timer,
} from 'lucide-react'
import LoginPrompt from './LoginPrompt'

const items = [
  {
    label: 'Question Bank',
    icon: Archive,
    requiresLogin: false,
    href: '/questions',
  },
  {
    label: 'Practice Questions',
    icon: BookOpen,
    requiresLogin: true,
    message: 'Sign in to start a guided practice session.',
  },
  {
    label: 'Take a Quiz',
    icon: ClipboardList,
    requiresLogin: true,
    message: 'Sign in to attempt quizzes and track your scores.',
  },
  {
    label: 'Mock Tests',
    icon: Timer,
    requiresLogin: true,
    message: 'Sign in to take full-length mock tests.',
  },
  {
    label: 'Previous Year Questions',
    icon: FileQuestion,
    requiresLogin: false,
    href: '#pyqs',
  },
]

export default function QuickStart() {
  const [loginMessage, setLoginMessage] = useState(null)

  const handleClick = (item) => {
    if (item.requiresLogin) {
      setLoginMessage(item.message)
    }
  }

  return (
    <>
      <aside className="quick-start">
        <h3 className="quick-start__title">Quick Start</h3>
        <p className="quick-start__subtitle">Jump into your preparation.</p>
        <ul className="quick-start__list">
          {items.map((item) => {
            const Icon = item.icon
            const content = (
              <>
                <span className="quick-start__icon">
                  <Icon size={18} />
                </span>
                <span className="quick-start__label">{item.label}</span>
                <ChevronRight size={18} className="quick-start__arrow" />
              </>
            )

            return (
              <li key={item.label}>
                {item.href && !item.requiresLogin ? (
                  <a href={item.href} className="quick-start__item">
                    {content}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="quick-start__item"
                    onClick={() => handleClick(item)}
                  >
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </aside>

      <LoginPrompt message={loginMessage} onClose={() => setLoginMessage(null)} />
    </>
  )
}
