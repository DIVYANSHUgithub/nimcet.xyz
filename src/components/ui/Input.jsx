import { cn } from '../../lib/cn'

export default function Input({
  id,
  label,
  hint,
  error,
  icon,
  trailing,
  className,
  wrapClassName,
  ...props
}) {
  const describedBy = [
    error ? `${id}-error` : null,
    hint && !error ? `${id}-hint` : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-semibold text-ink-heading"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex min-h-12 items-center gap-2.5 rounded-md border bg-surface px-3.5 transition-[border-color,box-shadow] focus-within:border-ink-heading focus-within:shadow-card',
          error ? 'border-danger-fg' : 'border-line-strong',
          wrapClassName
        )}
      >
        {icon ? (
          <span className="shrink-0 text-ink-muted" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          className="min-w-0 flex-1 bg-transparent py-3 text-[0.9375rem] text-ink-heading outline-none placeholder:text-ink-muted"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-danger-fg" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
