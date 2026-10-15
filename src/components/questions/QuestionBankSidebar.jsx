import SubjectList from './SubjectList'
import QuickLinks from './QuickLinks'

export default function QuestionBankSidebar({ subjects = [], selectedSubjectId, onSubjectSelect, onQuickLink, className = '' }) {
  return (
    <aside className={`flex flex-col gap-4 ${className}`} aria-label="Subjects and quick links">
      <SubjectList subjects={subjects} selectedId={selectedSubjectId} onSelect={onSubjectSelect} />
      <QuickLinks onAction={onQuickLink} />
    </aside>
  )
}
