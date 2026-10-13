import {
  BarChart3,
  Bookmark,
  ClipboardList,
  Target,
  TrendingUp,
} from 'lucide-react'
import SignInIllustration from './SignInIllustration'

const benefits = [
  { icon: BarChart3, text: 'Track your progress' },
  { icon: Bookmark, text: 'Save important questions' },
  { icon: ClipboardList, text: 'Take practice tests and quizzes' },
  { icon: Target, text: 'Identify your weak topics' },
  { icon: TrendingUp, text: 'Get detailed performance analytics' },
]

export default function SignInBenefits() {
  return (
    <aside className="auth-benefits">
      <SignInIllustration />
      <h2 className="auth-benefits__title">Track Your Preparation</h2>
      <p className="auth-benefits__text">
        Login to access practice tests, quizzes, bookmarks and detailed analytics
        to improve your performance.
      </p>
      <ul className="auth-benefits__list">
        {benefits.map(({ icon: Icon, text }) => (
          <li key={text} className="auth-benefits__item">
            <span className="auth-benefits__icon">
              <Icon size={16} strokeWidth={1.75} />
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
