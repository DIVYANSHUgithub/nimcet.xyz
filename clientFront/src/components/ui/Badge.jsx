import { cn } from '../../lib/cn'

const tones = {
  default: 'border-line bg-canvas-muted text-ink-muted',
  easy: 'border-success-border bg-success-bg text-success',
  medium: 'border-warning-border bg-warning-bg text-warning',
  hard: 'border-danger-border bg-danger-bg text-danger',
}

export default function Badge({ children, tone = 'default', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone] || tones.default,
        className
      )}
    >
      {children}
    </span>
  )
}

