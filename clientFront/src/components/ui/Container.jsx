import { cn } from '../../lib/cn'

export default function Container({ as: Comp = 'div', className, ...props }) {
  return (
    <Comp
      className={cn('mx-auto w-full max-w-content px-5 md:px-8', className)}
      {...props}
    />
  )
}
