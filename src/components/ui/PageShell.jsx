import { cn } from '../../lib/cn'
import Footer from '../Footer'
import Navbar from '../Navbar'

export default function PageShell({ children, className, mainClassName }) {
  return (
    <div className={cn('flex min-h-svh flex-col bg-canvas', className)}>
      <Navbar />
      <div className={cn('flex-1', mainClassName)}>{children}</div>
      <Footer />
    </div>
  )
}
