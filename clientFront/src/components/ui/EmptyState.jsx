import { cn } from '../../lib/cn'

export default function EmptyState({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface px-4 py-8 text-center text-[0.9375rem] text-ink-muted',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
