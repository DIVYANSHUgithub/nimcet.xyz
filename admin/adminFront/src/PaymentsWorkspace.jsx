
import { useState } from 'react'
import { backendRequest } from '../../../clientFront/src/lib/backendApi'
import { indiaTime, passOrderLabels, rupees } from '../../../clientFront/src/lib/studentPass'
import { useAdminList } from './adminRequests'

const money = amount => rupees.format(amount / 100)
const time = value => value ? indiaTime.format(new Date(value)) + ' IST' : '—'
const offerTime = value => value
  ? new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 16) : ''

export default function PaymentsWorkspace() {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { data, error: loadError, loading, reload } = useAdminList('admin/payments', { queue: filter, page })

  async function act(path, method, body, success) {
    setBusy(true); setMessage(''); setError('')
    try {
      await backendRequest(`admin/payments/${path}`, { method, ...(body ? { body } : {}) })
      setMessage(success)
      reload()
    } catch (err) { setError(err.message); reload() } finally { setBusy(false) }
  }

  return <section className="question-workspace" aria-label="Student Pass payments">
    <h2>Student Pass payments</h2>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loadError && <p className="admin-error" role="alert">{loadError}</p>}
    {message && <p role="status">{message}</p>}
    {data?.gateway_actions_available === false && <p className="admin-notice">
      You can view captured orders. Set the backend Razorpay credentials to reconcile or approve refunds.
    </p>}
    {data?.offer && <OfferForm key={JSON.stringify(data.offer)} offer={data.offer} busy={busy} act={act} />}
    <div className="admin-role-actions">
      <label>Queue<select value={filter} onChange={event => { setFilter(event.target.value); setPage(1) }}>
        <option value="all">All orders and payments</option><option value="refund">Refund review and pending</option>
        <option value="checkout">Unconfirmed checkout</option>
      </select></label>
      <button className="admin-secondary" onClick={reload} disabled={busy}>Refresh</button>
    </div>
    {loading && <p role="status">Loading orders…</p>}
    {data && data.items.length === 0 && <p>No orders in this queue.</p>}
    {data?.items.map(row => <PaymentRow key={row.gateway_payment_id || row.id} row={row} act={act} busy={busy} gatewayAvailable={data.gateway_actions_available !== false} />)}
    <div className="admin-role-actions">
      <button className="admin-secondary" disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}>Previous</button>
      <button className="admin-secondary" disabled={!data?.has_more || busy} onClick={() => setPage(value => value + 1)}>Next</button>
    </div>
  </section>
}

function PaymentRow({ row, act, busy, gatewayAvailable }) {
  const [reason, setReason] = useState('')
  const [showRefund, setShowRefund] = useState(false)
  const canRefund = row.gateway_payment_id && !['processed', 'pending'].includes(row.refund_status)
  return <article className="admin-form">
    <strong>{passOrderLabels[row.status]} · {money(row.amount)}</strong>
    <div>Order {row.id} · Student {row.user_id}</div>
    {row.gateway_order_id && <div>Razorpay order {row.gateway_order_id}</div>}
    {row.gateway_payment_id && <div>Payment {row.gateway_payment_id} · Confirmed {time(row.confirmed_at)}</div>}
    {row.gateway_refund_id && <div>Refund {row.gateway_refund_id}</div>}
    {row.refund_reason && <div>Refund reason: {row.refund_reason}</div>}
    <div className="admin-role-actions">
      {row.gateway_order_id && <button className="admin-secondary" disabled={busy || !gatewayAvailable} onClick={() => act(`orders/${row.id}/reconcile`, 'POST', null, 'Gateway status checked.')}>Check Razorpay</button>}
      {canRefund && <button className="admin-secondary" disabled={busy || !gatewayAvailable} onClick={() => setShowRefund(value => !value)}>
        {row.refund_status === 'requested' || row.refund_status === 'failed' ? 'Retry refund' : 'Review refund'}
      </button>}
    </div>
    {showRefund && canRefund && <form className="admin-role-actions" onSubmit={event => {
      event.preventDefault()
      act(`${row.gateway_payment_id}/refund`, 'POST', { reason: reason.trim() }, 'Refund request checked. See the latest status below.')
      setShowRefund(false)
    }}>
      <label>Reason for full refund<input required minLength={4} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <button disabled={busy || !gatewayAvailable || reason.trim().length < 4}>{row.refund_status === 'requested'
        ? `Retry ${money(row.amount)} refund` : `Approve ${money(row.amount)} refund`}</button>
    </form>}
  </article>
}

function OfferForm({ offer, busy, act }) {
  const [label, setLabel] = useState(offer.offer_label || '')
  const [amount, setAmount] = useState(offer.offer_amount ? String(offer.offer_amount / 100) : '')
  const [starts, setStarts] = useState(offerTime(offer.offer_starts_at))
  const [ends, setEnds] = useState(offerTime(offer.offer_ends_at))
  return <form className="admin-form" onSubmit={event => {
    event.preventDefault()
    act('offer', 'PUT', { label, amount: Math.round(Number(amount) * 100),
      starts_at: starts + ':00+05:30', ends_at: ends + ':00+05:30' }, 'Offer saved.')
  }}>
    <h3>Season pricing</h3>
    <p>Standard price {money(offer.standard_amount)}. One temporary offer can be scheduled at a time.</p>
    <label>Offer name<input value={label} required maxLength={80} onChange={event => setLabel(event.target.value)} /></label>
    <label>Offer price in INR<input value={amount} type="number" inputMode="decimal" min="1" max={offer.standard_amount / 100 - 0.01} step=".01" required onChange={event => setAmount(event.target.value)} /></label>
    <label>Starts (IST)<input value={starts} type="datetime-local" required onChange={event => setStarts(event.target.value)} /></label>
    <label>Ends (IST)<input value={ends} type="datetime-local" required max={offerTime(offer.checkout_closes_at)} onChange={event => setEnds(event.target.value)} /></label>
    <div className="admin-role-actions">
      <button disabled={busy}>Save offer</button>
      {offer.offer_label && <button type="button" className="admin-secondary" disabled={busy} onClick={() => act('offer', 'DELETE', null, 'Offer removed.')}>Remove offer</button>}
    </div>
  </form>
}
