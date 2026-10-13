import { cn } from '../lib/cn'

export default function SectionHeader({
  title,
  subtitle,
  meta,
  action,
  className = '',
}) {
  return (
    <div
      className={cn(
        'mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div>
        <h2 className="mb-1.5 text-[clamp(1.375rem,2.5vw,1.625rem)] font-bold tracking-tight text-ink-heading">
          {title}
        </h2>
        {subtitle && (
          <p className="max-w-xl text-[0.9375rem] text-ink-muted">{subtitle}</p>
        )}
      </div>
      {(meta || action) && (
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end sm:text-right">
          {action}
          {meta && (
            <span className="whitespace-nowrap text-[0.8125rem] text-ink-muted">
              {meta}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
