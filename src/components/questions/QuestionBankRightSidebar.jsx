import PracticeCard from './PracticeCard'
import PopularTopicsCard from './PopularTopicsCard'

export default function QuestionBankRightSidebar() {
  return (
    <aside className="qb-sidebar qb-sidebar--right" aria-label="Practice and topics">
      <PracticeCard />
      <PopularTopicsCard />
    </aside>
  )
}
