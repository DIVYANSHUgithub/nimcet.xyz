import { Lock } from 'lucide-react'

export default function PracticeCTA() {
  return (
    <section className="practice-cta">
      <div className="container">
        <div className="practice-cta__card">
          <Lock size={24} className="practice-cta__icon" aria-hidden="true" />
          <h3 className="practice-cta__title">Want to practice these questions?</h3>
          <p className="practice-cta__text">
            Login to start a practice session, track your progress and get detailed
            analytics.
          </p>
          <button type="button" className="btn btn--primary">
            Login to Practice
          </button>
        </div>
      </div>
    </section>
  )
}
