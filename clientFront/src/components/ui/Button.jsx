import { cn } from '../../lib/cn'

const variants = {
  primary:
    'border-brand bg-brand text-white hover:bg-brand-hover hover:border-brand-hover',
  secondary:
    'border-line-strong bg-surface text-ink-heading hover:bg-canvas-muted',
  ghost:
    'border-line-strong bg-transparent text-ink-heading hover:bg-canvas-muted',
}

const sizes = {
  sm: 'min-h-9 px-3 text-[0.8125rem]',
  md: 'min-h-10 px-5 text-sm',
  lg: 'min-h-12 px-5 text-[0.9375rem] font-semibold',
}

export default function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  full = false,
  className,
  type,
  ...props
}) {
  return (
    <Comp
      type={Comp === 'button' ? type || 'button' : type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className
      )}
      {...props}
    />
  )
}
