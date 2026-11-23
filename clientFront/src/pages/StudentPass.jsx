
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Button from '../components/ui/Button'
import { useAuth } from '../context/useAuth'
import { backendGet, backendRequest } from '../lib/backendApi'
import { authLinkTo } from '../lib/navigation'
import { legalDetails } from '../lib/legal'
import { indiaTime, loadRazorpay, passOrderLabels, rupees } from '../lib/studentPass'

export default function StudentPass() {
  const { user, loading } = useAuth()
  return <PassPage key={user?.id ?? 'guest'} user={user} authLoading={loading} />
}

function PassPage({ user, authLoading }) {
  const location = useLocation()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const checkAgain = () => setRevision(value => value + 1)
  const order = data?.orders?.[0]
  const waiting = ['awaiting_payment', 'awaiting_approval', 'review_overdue', 'refund_pending'].includes(order?.status)

  useEffect(() => {
    if (authLoading) return undefined
    const controller = new AbortController()
    const load = () => backendGet('payments/pass', { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value) })
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
    load()
    const timer = waiting ? setInterval(load, 15000) : null
    return () => { controller.abort(); clearInterval(timer) }
  }, [authLoading, revision, waiting])

  const canBuy = data?.checkout_open && (!order || ['awaiting_payment', 'refunded'].includes(order.status))
  const quote = order?.status === 'awaiting_payment' ? order : data
  const effectiveEnd = data?.ends_at ? new Date(new Date(data.ends_at).getTime() - 60000) : null

  async function checkout() {
    if (busy || !canBuy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const Razorpay = await loadRazorpay()
      const pending = await backendRequest('payments/orders', { method: 'POST', body: { amount: quote.amount } })
      const finish = () => { setBusy(false); checkAgain() }
      const widget = new Razorpay({
        key: pending.key_id, order_id: pending.razorpay_order_id, amount: pending.amount, currency: pending.currency,
        name: 'NIMCET.XYZ', description: 'Student Pass',
        prefill: user?.email ? { email: user.email } : undefined,
        modal: { ondismiss: finish },
        handler: async result => {
          try {
            const verified = await backendRequest('payments/verify', {
              method: 'POST',
              body: {
                order_id: pending.order_id, razorpay_order_id: result.razorpay_order_id,
                razorpay_payment_id: result.razorpay_payment_id, razorpay_signature: result.razorpay_signature,
              },
            })
            setData(verified)
          } catch (err) {
            setError(err.message)
            setNotice('If you were charged, check your order status before paying again.')
          } finally { finish() }
        },
      })
      widget.on('payment.failed', () => setNotice('Payment did not complete. If you see a debit, check your order status before retrying.'))
      widget.open()
    } catch (err) { setError(err.message); setBusy(false); checkAgain() }
  }

  async function reconcile(id) {
    setBusy(true); setError(''); setNotice('')
    try {
      setData(await backendRequest(`payments/orders/${id}/reconcile`, { method: 'POST' }))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return <div className="flex min-h-svh flex-col bg-canvas">
    <Navbar />
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
      <h1 className="text-3xl font-bold text-ink-heading">Student Pass</h1>
      {error && <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-danger-bg p-4 text-sm text-danger" role="alert">
        <span>{error}</span><Button size="sm" variant="secondary" onClick={() => { setError(''); checkAgain() }}>Refresh</Button>
      </div>}
      {notice && <p className="mt-3 text-sm text-ink-muted" role="status">{notice}</p>}
      {!data && !error && <p className="mt-4 text-sm text-ink-muted" role="status">Loading Student Pass…</p>}
      {data && !data.enabled && <p className="mt-4 text-ink-muted">Student Pass sales are currently unavailable. You can still <Link className="underline" to="/tests">browse tests</Link>.</p>}
      {data?.enabled && <>
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <p className="text-ink-heading">Unlock all current and upcoming paid tests and features for this season.</p>
          <p className="mt-2 text-sm text-ink-muted">Access lasts through {indiaTime.format(effectiveEnd)} IST. The Question Bank and PYQs stay free.</p>
          {data.active ? <Button as={Link} className="mt-5" to="/tests">Browse unlocked tests</Button> : <>
            {canBuy && <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-ink-heading">{rupees.format(quote.amount / 100)}</span>
              {quote.amount < quote.standard_amount && <>
                <span className="text-ink-muted line-through">{rupees.format(quote.standard_amount / 100)}</span>
                <span className="text-sm font-semibold text-accent">{quote.offer_label}</span>
              </>}
            </div>}
            {canBuy && <p className="mt-2 text-sm leading-6 text-ink-muted">
              One-time payment via Razorpay. An admin reviews your verified payment within {data.review_hours} hours.
              Sales close {indiaTime.format(new Date(data.checkout_closes_at))} IST.
            </p>}
            {canBuy && <div className="mt-4 flex flex-wrap items-center gap-4">
              {user ? <Button disabled={busy} onClick={checkout}>{busy ? 'Please wait…' : order?.status === 'awaiting_payment' ? 'Continue to checkout' : 'Buy Pass'}</Button>
                : <Button as={Link} to={authLinkTo('/login', location)}>Sign in to buy</Button>}
              <Link className="text-sm font-medium text-brand underline" to="/terms#refunds">Payment and refund terms</Link>
            </div>}
            {!canBuy && !data.checkout_open && <p className="mt-3 text-sm font-medium text-ink-muted">{data.sales_paused
              ? 'Student Pass checkout is temporarily paused.' : 'Student Pass sales have closed for this season.'}</p>}
          </>}
        </section>
        {user && data.orders.length > 0 && <section className="mt-8" aria-label="Your pass orders">
          <h2 className="text-xl font-semibold text-ink-heading">Your orders</h2>
          <ul className="mt-3 space-y-3">
            {data.orders.map(purchase => <li key={purchase.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <strong className="text-ink-heading">{passOrderLabels[purchase.status]}</strong>
                <span>{rupees.format(purchase.amount / 100)}</span>
              </div>
              <p className="mt-1 break-all text-xs text-ink-muted">Order {purchase.id}</p>
              {purchase.status === 'awaiting_approval' && <p className="mt-2 text-sm text-ink-muted">Review due {indiaTime.format(new Date(purchase.review_due_at))} IST.</p>}
              <div className="mt-3 flex flex-wrap gap-3">
                {['awaiting_payment', 'checkout_closed', 'refund_pending'].includes(purchase.status) &&
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => reconcile(purchase.id)}>Check payment status</Button>}
                {['awaiting_payment', 'checkout_closed', 'review_overdue', 'refund_review', 'refund_failed', 'refund_pending'].includes(purchase.status) &&
                  <a className="self-center text-sm font-medium text-brand underline" href={`mailto:${legalDetails.email}?subject=${encodeURIComponent(`Student Pass support: ${purchase.id}`)}`}>Contact payment support</a>}
              </div>
            </li>)}
          </ul>
        </section>}
      </>}
    </main>
    <Footer />
  </div>
}
