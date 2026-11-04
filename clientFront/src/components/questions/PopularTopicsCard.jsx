export default function PopularTopicsCard({ topics = [], onTopicSelect }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-1 text-sm font-semibold text-ink-heading">Browse topics</h2>
      <p className="mb-3 text-xs text-ink-muted">Topic names verified in the published question set.</p>
      <ul className="space-y-1">
        {topics.map((topic) => (
          <li key={topic}>
            <button
              type="button"
              className="min-h-9 w-full rounded-md px-2 text-left text-sm text-ink transition-colors hover:bg-canvas-muted hover:text-ink-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              onClick={() => onTopicSelect?.(topic)}
            >
              {topic}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
