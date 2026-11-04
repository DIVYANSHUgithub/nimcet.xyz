import { cn } from '../../lib/cn'

export default function Card({ as: Comp = 'div', className, ...props }) {
  return (
    <Comp
      className={cn(
        'rounded-lg border border-line bg-surface p-4',
        className
      )}
      {...props}
    />
  )
}
