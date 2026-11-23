
let checkoutLoader

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (!checkoutLoader) {
    checkoutLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      const fail = () => {
        clearTimeout(timeout)
        script.remove()
        reject(new Error('Razorpay Checkout could not load. Try again.'))
      }
      const timeout = setTimeout(fail, 12000)
      script.onload = () => {
        clearTimeout(timeout)
        if (typeof window.Razorpay === 'function') resolve(window.Razorpay)
        else fail()
      }
      script.onerror = fail
      document.head.appendChild(script)
    }).catch(error => { checkoutLoader = undefined; throw error })
  }
  return checkoutLoader
}

export const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 })
export const indiaTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
})

export const passOrderLabels = {
  awaiting_payment: 'Awaiting payment',
  checkout_closed: 'Checkout closed',
  awaiting_approval: 'Paid · Awaiting approval',
  review_overdue: 'Paid · Approval overdue',
  active: 'Pass active',
  expired: 'Pass expired',
  duplicate_payment: 'Duplicate payment · Refund review',
  refund_review: 'Refund review',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
  refund_failed: 'Refund needs attention',
}
