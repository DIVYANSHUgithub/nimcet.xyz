import { cn } from '../../lib/cn'
import MathText from '../MathText'

const letterClass =
  'inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-muted text-xs font-bold text-ink-heading'

export default function QuestionOption({
  letter,
  content,
  children,
  as: Comp = 'div',
  selected = false,
  state,
  interactive = false,
  className,
  spanFull = false,
  ...props
}) {
  const body = children ?? <MathText>{content}</MathText>

  return (
    <Comp
      className={cn(
        'flex min-h-11 min-w-0 items-start gap-2.5 rounded-md border px-3 py-3 text-left',
        spanFull && 'col-span-full',
        interactive &&
          'cursor-pointer transition-colors hover:border-info-border hover:bg-option-hover focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
        !interactive && 'cursor-default bg-surface',
        selected
          ? 'border-option-selected-border bg-option-selected shadow-[inset_0_0_0_1px_var(--color-option-selected-border)]'
          : 'border-line bg-surface',
        state === 'correct' && 'border-success-border bg-success-bg',
        state === 'incorrect' && 'border-danger-border bg-danger-bg',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          letterClass,
          selected && 'border-option-selected-border bg-option-selected',
          state === 'correct' && 'border-success-border bg-success-bg text-success',
          state === 'incorrect' && 'border-danger-border bg-danger-bg text-danger'
        )}
        aria-hidden="true"
      >
        {letter}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">
        {body}
      </span>
    </Comp>
  )
}

export function OptionGrid({ children, className }) {
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2',
        className
      )}
    >
      {children}
    </div>
  )
}
