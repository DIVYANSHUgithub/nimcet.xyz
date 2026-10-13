import { ChevronDown } from 'lucide-react'
import { subjectTabs } from '../../data/questionBank'

function FilterSelect({ label, value, onChange, options, id }) {
  return (
    <div className="qb-filter">
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <select
        id={id}
        className="qb-filter__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="qb-filter__chevron" aria-hidden="true" />
    </div>
  )
}

export default function QuestionFilters({
  subjectTab,
  onSubjectTabChange,
  chapter,
  topic,
  difficulty,
  questionType,
  year,
  sort,
  onChapterChange,
  onTopicChange,
  onDifficultyChange,
  onQuestionTypeChange,
  onYearChange,
  onSortChange,
  chapterOptions,
  topicOptions,
  yearOptions,
}) {
  return (
    <div className="qb-filters">
      <div className="qb-tabs" role="tablist" aria-label="Filter by subject">
        {subjectTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subjectTab === tab.id}
            className={`qb-tabs__tab ${subjectTab === tab.id ? 'qb-tabs__tab--active' : ''}`}
            onClick={() => onSubjectTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="qb-filters__bar">
        <div className="qb-filters__dropdowns">
          <FilterSelect
            id="filter-chapter"
            label="Chapter"
            value={chapter}
            onChange={onChapterChange}
            options={chapterOptions}
          />
          <FilterSelect
            id="filter-topic"
            label="Topic"
            value={topic}
            onChange={onTopicChange}
            options={topicOptions}
          />
          <FilterSelect
            id="filter-difficulty"
            label="Difficulty"
            value={difficulty}
            onChange={onDifficultyChange}
            options={['Easy', 'Medium', 'Hard']}
          />
          <FilterSelect
            id="filter-type"
            label="Question Type"
            value={questionType}
            onChange={onQuestionTypeChange}
            options={['MCQ']}
          />
          <FilterSelect
            id="filter-year"
            label="Year"
            value={year}
            onChange={onYearChange}
            options={yearOptions}
          />
        </div>
        <div className="qb-filters__sort">
          <div className="qb-filter">
            <label htmlFor="filter-sort" className="visually-hidden">
              Sort questions
            </label>
            <select
              id="filter-sort"
              className="qb-filter__select"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="attempts">Most Attempted</option>
            </select>
            <ChevronDown size={14} className="qb-filter__chevron" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}
