import SubjectList from './SubjectList'
import QuickLinks from './QuickLinks'

export default function QuestionBankSidebar({ selectedSubjectId, onSubjectSelect }) {
  return (
    <aside className="qb-sidebar qb-sidebar--left" aria-label="Subjects and quick links">
      <SubjectList selectedId={selectedSubjectId} onSelect={onSubjectSelect} />
      <QuickLinks />
    </aside>
  )
}
