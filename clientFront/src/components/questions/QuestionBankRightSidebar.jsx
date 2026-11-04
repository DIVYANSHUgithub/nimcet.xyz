import PracticeCard from './PracticeCard'
import PopularTopicsCard from './PopularTopicsCard'

export default function QuestionBankRightSidebar({ topics = [], onTopicSelect, className = '' }) {
  return (
    <aside className={`flex flex-col gap-4 ${className}`} aria-label="Practice and topics">
      <PracticeCard />
      <PopularTopicsCard topics={topics} onTopicSelect={onTopicSelect} />
    </aside>
  )
}
