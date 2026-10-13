import { useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import SectionHeader from '../components/SectionHeader'
// import HighlightQuestion from '../components/HighlightQuestion'
// import QuickStart from '../components/QuickStart'
import SubjectCard from '../components/SubjectCard'
import PopularTopics from '../components/PopularTopics'
import DailyQuestions from '../components/DailyQuestions'
import PracticeCTA from '../components/PracticeCTA'
import Footer from '../components/Footer'
import { subjects } from '../data/subjects'
// import { formatDisplayDate } from '../utils/formatDate'

export default function Home() {
  const [subjectNotice, setSubjectNotice] = useState(null)

  return (
    <div className="home">
      <Navbar />
      <main>
        <Hero />

        {/* <section className="section highlight-section">
          <div className="container">
            <SectionHeader
              title="Today's Challenge"
              subtitle="A handpicked question to kickstart your practice."
              meta={formatDisplayDate()}
            />
            <div className="highlight-section__grid">
              <HighlightQuestion />
              <QuickStart />
            </div>
          </div>
        </section> */}

        <section className="section subjects-section">
          <div className="container">
            <SectionHeader
              title="Explore by Subject"
              subtitle="Browse questions by subject and start learning."
            />
            {subjectNotice && (
              <p className="subjects-section__notice" role="status">
                {subjectNotice}
              </p>
            )}
            <div className="subjects-section__grid">
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onClick={(s) =>
                    setSubjectNotice(`Question bank for ${s.name} — coming soon.`)
                  }
                />
              ))}
            </div>
          </div>
        </section>

        <PopularTopics />
        <DailyQuestions />
        <PracticeCTA />
      </main>
      <Footer />
    </div>
  )
}
