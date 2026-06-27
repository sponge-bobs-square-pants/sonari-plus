import crypto from 'crypto'
import {
  razorpay,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
} from '../config/razorpay.js'

/**
 * Razorpay provider — the existing flow, wrapped behind the shared
 * provider interface so orderController can call it identically to PhonePe.
 *
 * Interface (see ./index.js for the dispatch logic):
 *   createCheckout(order)       → { provider, razorpay: { orderId, amount, currency, keyId } }
 *   verifyClientCallback(order, body) → { valid, paymentId }
 *   verifyWebhook(req)          → { valid, event, providerOrderId, paymentId }
 *   recheckStatus(order)        → 'paid' | 'failed' | 'pending'
 */

export const name = 'razorpay'

export async function createCheckout(order) {
  const rzpOrder = await razorpay.orders.create({
    amount: Math.round(order.total * 100), // paise
    currency: 'INR',
    receipt: order._id.toString(),
  })
  order.razorpayOrderId = rzpOrder.id
  await order.save()
  return {
    provider: 'razorpay',
    razorpay: {
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: RAZORPAY_KEY_ID,
    },
  }
}

/**
 * Verify the browser-side callback's HMAC signature. The client posts the
 * three razorpay_* fields it received from the Checkout popup.
 */
export async function verifyClientCallback(_order, body) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { valid: false, paymentId: '' }
  }
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')
  return {
    valid: expected === razorpay_signature,
    paymentId: razorpay_payment_id,
  }
}

/**
 * Verify the S2S webhook signature against the raw body (the route layer
 * captures it on req.rawBody via express.json's verify hook).
 */
export async function verifyWebhook(req) {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    return { valid: false, event: '', providerOrderId: '', paymentId: '' }
  }
  const signature = req.headers['x-razorpay-signature']
  const expected = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(req.rawBody || Buffer.from(''))
    .digest('hex')
  if (!signature || expected !== signature) {
    return { valid: false, event: '', providerOrderId: '', paymentId: '' }
  }
  const { event, payload } = req.body
  const payment = payload?.payment?.entity
  return {
    valid: true,
    event, // 'payment.captured' | 'payment.failed' | ...
    providerOrderId: payment?.order_id || '',
    paymentId: payment?.id || '',
  }
}

/**
 * Admin re-check — hit Razorpay directly and confirm a CAPTURED payment
 * whose amount matches our total. The owner's stricter rule: a partial
 * or wrong-amount capture does NOT count as paid.
 */
export async function recheckStatus(order) {
  if (!order.razorpayOrderId) return 'pending'
  const { items = [] } = await razorpay.orders.fetchPayments(order.razorpayOrderId)
  const expectedPaise = Math.round(order.total * 100)
  const cleanCapture = items.some(
    (p) => p.status === 'captured' && p.amount === expectedPaise,
  )
  if (cleanCapture) return 'paid'
  const anyCapture = items.some((p) => p.status === 'captured')
  if (!anyCapture && items.some((p) => p.status === 'failed')) return 'failed'
  return 'pending'
}

/** How to find an order from a webhook's providerOrderId — used by the dispatcher. */
export const findOrderByWebhook = (Order, providerOrderId) =>
  Order.findOne({ razorpayOrderId: providerOrderId })

/** Stamp the verified payment id onto the right field. */
export function stampPaymentId(order, paymentId) {
  order.razorpayPaymentId = paymentId
}
