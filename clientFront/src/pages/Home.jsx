import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import SectionHeader from '../components/SectionHeader'
import SubjectCard from '../components/SubjectCard'
import DailyQuestions from '../components/DailyQuestions'
import PracticeCTA from '../components/PracticeCTA'
import Footer from '../components/Footer'
import Container from '../components/ui/Container'
import { useQuestionFacets } from '../hooks/useQuestionFacets'

export default function Home() {
  const { subjects, topics } = useQuestionFacets()
  const featuredTopics = topics.slice(0, 9)
  const searchableItems = [
    ...topics.map((label) => ({ type: 'topic', label })),
    ...subjects.map(({ name }) => ({ type: 'subject', label: name })),
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero topics={featuredTopics} searchableItems={searchableItems} />
        <section className="py-14 sm:py-16">
          <Container>
            <SectionHeader title="Explore by Subject" subtitle="Browse published questions by subject." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
              {subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} />)}
            </div>
          </Container>
        </section>
        <DailyQuestions />
        <PracticeCTA />
      </main>
      <Footer />
    </div>
  )
}

// import { useNavigate } from 'react-router-dom'
// import Navbar from '../components/Navbar'
// import Hero from '../components/Hero'
// import Footer from '../components/Footer'
// import Container from '../components/ui/Container'
// import { useQuestionFacets } from '../hooks/useQuestionFacets'
// import DailyQuestions from '../components/DailyQuestions'

// const topicStyles = [
//   'bg-blue-50 text-blue-600',
//   'bg-emerald-50 text-emerald-600',
//   'bg-violet-50 text-violet-600',
//   'bg-orange-50 text-orange-600',
// ]

// function TopicIcon({ index }) {
//   const paths = [
//     <>
//       <rect x="4" y="3" width="16" height="18" rx="2" />
//       <path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 18h2m4 0h2" />
//     </>,
//     <>
//       <path d="M12 3a4 4 0 0 0-4 4 4 4 0 0 0-3 6 4 4 0 0 0 3 6 4 4 0 0 0 4 2" />
//       <path d="M12 3a4 4 0 0 1 4 4 4 4 0 0 1 3 6 4 4 0 0 1-3 6 4 4 0 0 1-4 2" />
//       <path d="M9 9h1m4 0h1m-7 5h2m4 0h2m-7 4h2m4 0h1" />
//     </>,
//     <>
//       <rect x="3" y="4" width="18" height="13" rx="2" />
//       <path d="M8 21h8m-4-4v4" />
//     </>,
//     <>
//       <path d="M12 4v16M12 4C8 2 4 3 3 5v14c3-2 6-1 9 1M12 4c4-2 8-1 9 1v14c-3-2-6-1-9 1" />
//     </>,
//   ]

//   return (
//     <svg
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.8"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       aria-hidden="true"
//       className="h-7 w-7"
//     >
//       {paths[index % paths.length]}
//     </svg>
//   )
// }

// function TopicCard({ topic, index, onClick }) {
//   const { subjects, topics } = useQuestionFacets()
//   const label = typeof topic === 'string' ? topic : topic.name ?? topic.label
//   const count =
//     typeof topic === 'object'
//       ? topic.questionCount ?? topic.count ?? topic.questions
//       : null

//   return (
//     <button
//       type="button"
//       onClick={() => onClick(label)}
//       className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
//     >
//       {/* <span
//         className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${topicStyles[index % topicStyles.length]}`}
//       >
//         <TopicIcon index={index} />
//       </span> */}
//       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
//                       {subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} />)}
//            </div>
      
//       <span className="min-w-0 flex-1">
//         <span className="block truncate text-sm font-bold text-slate-900">
//           {label}
//         </span>
//         <span className="mt-1 block text-xs text-slate-500">
//           {count ? `${count} questions` : 'Explore questions'}
//         </span>
//       </span>

//       <span
//         aria-hidden="true"
//         className="shrink-0 text-xl text-slate-500 transition group-hover:translate-x-1 group-hover:text-slate-950"
//       >
//         →
//       </span>
//     </button>
//   )
// }

// function MotivationCard() {
//   return (
//     <aside className="relative flex min-h-full flex-col justify-center overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-blue-50 to-white p-6 sm:p-7">
//       <span aria-hidden="true" className="text-5xl font-bold leading-none text-sky-500">
//         “
//       </span>

//       <blockquote className="relative mt-1 text-lg font-bold leading-7 tracking-tight text-slate-900">
//         Consistent practice
//         <br />
//         turns confusion into clarity.
//       </blockquote>

//       <p className="mt-3 text-sm text-slate-600">— NIMCET.XYZ</p>

//       <svg
//         viewBox="0 0 100 85"
//         fill="none"
//         aria-hidden="true"
//         className="absolute bottom-4 right-4 h-20 w-24 text-blue-200/50"
//       >
//         <rect x="8" y="57" width="16" height="22" rx="3" fill="currentColor" />
//         <rect x="32" y="40" width="16" height="39" rx="3" fill="currentColor" />
//         <rect x="56" y="22" width="16" height="57" rx="3" fill="currentColor" />
//         <path d="m8 48 25-16 24-20 16-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
//       </svg>
//     </aside>
//   )
// }

// export default function Home() {
//   const navigate = useNavigate()
//   const { subjects, topics } = useQuestionFacets()

//   const featuredTopics = (topics ?? []).slice(0, 4)

//   const goToTopic = (topic) => {
//     navigate(`/questions?search=${encodeURIComponent(topic)}`)
//   }

//   return (
//     <div className="flex min-h-svh flex-col bg-white">
//       <Navbar />

//       <main className="flex-1">
//         <Hero />

//         <section className="pb-8 sm:pb-12">
//           <Container>
//             <div className="grid gap-4 lg:grid-cols-[minmax(0,3.1fr)_minmax(260px,1fr)]">
//               <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
//                 <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
//                   <div>
//                     <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
//                       Explore by Topic
//                     </h2>
//                     <p className="mt-1 text-sm text-slate-600">
//                       Jump into your favorite subject and start practicing.
//                     </p>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={() => navigate('/questions')}
//                     className="inline-flex items-center gap-2 py-1 text-sm font-bold text-slate-900 transition hover:text-blue-600"
//                   >
//                     View All Topics <span aria-hidden="true">→</span>
//                   </button>
//                 </div>

//                 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
//                   {featuredTopics.map((topic, index) => (
//                     <TopicCard
//                       key={typeof topic === 'string' ? topic : topic.id ?? topic.name ?? index}
//                       topic={topic}
//                       index={index}
//                       onClick={goToTopic}
//                     />
//                   ))}

//                   {featuredTopics.length === 0 &&
//                     (subjects ?? []).slice(0, 4).map((subject, index) => (
//                       <TopicCard
//                         key={subject.id ?? subject.name ?? index}
//                         topic={subject}
//                         index={index}
//                         onClick={goToTopic}
//                       />
//                     ))}
//                 </div>
//               </div>

//               <MotivationCard />
//             </div>
//           </Container>
//         </section>
//         <DailyQuestions />
//       </main>

//       <Footer />
//     </div>
//   )
// }
