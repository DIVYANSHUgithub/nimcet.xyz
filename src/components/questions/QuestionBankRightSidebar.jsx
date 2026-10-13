import PracticeCard from './PracticeCard'
import PopularTopicsCard from './PopularTopicsCard'

export default function QuestionBankRightSidebar({ onTopicSelect, className = '' }) {
  return (
    <aside className={`flex flex-col gap-4 ${className}`} aria-label="Practice and topics">
      <PracticeCard />
      <PopularTopicsCard onTopicSelect={onTopicSelect} />
    </aside>
  )
}
