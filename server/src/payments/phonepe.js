import crypto from 'crypto'
import { PHONEPE } from '../config/phonepe.js'

/**
 * PhonePe PG v2 provider (OAuth client credentials flow).
 *
 * Differs from Razorpay in three ways:
 * - Auth is a short-lived OAuth bearer token, cached and refreshed lazily.
 * - Checkout is a redirect (not a popup) — server returns a redirectUrl
 *   that the browser goes to; PhonePe redirects back to redirectUrl after
 *   payment, with the merchantOrderId so we can poll status.
 * - Webhook auth is HTTP-Basic-ish: PhonePe sends
 *   `Authorization: SHA256(username:password)` configured in the portal.
 *
 * Interface contract is identical to ./razorpay.js so the dispatcher
 * can treat them interchangeably.
 */

export const name = 'phonepe'

/* ── OAuth token cache ────────────────────────────────────────────── */

// Module-scoped cache: avoid token round-trip on every API call. Refreshed
// 60s before expiry to absorb clock skew.
let cachedToken = null // { token, expiresAt: epoch_ms }
const TOKEN_BUFFER_MS = 60_000

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt - Date.now() > TOKEN_BUFFER_MS) {
    return cachedToken.token
  }
  const body = new URLSearchParams({
    client_id: PHONEPE.clientId || '',
    client_secret: PHONEPE.clientSecret || '',
    client_version: PHONEPE.clientVersion,
    grant_type: 'client_credentials',
  })
  const res = await fetch(PHONEPE.authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`PhonePe OAuth ${res.status}: ${text || res.statusText}`)
  }
  const json = await res.json()
  // v2 returns expires_at (epoch s) OR expires_in (s). Handle both.
  const expiresAt = json.expires_at
    ? json.expires_at * 1000
    : Date.now() + (json.expires_in || 3600) * 1000
  cachedToken = { token: json.access_token, expiresAt }
  return cachedToken.token
}

/* ── Request helper ──────────────────────────────────────────────── */

async function pgFetch(method, path, jsonBody) {
  const token = await getAccessToken()
  const res = await fetch(`${PHONEPE.apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `O-Bearer ${token}`,
    },
    body: jsonBody ? JSON.stringify(jsonBody) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* PhonePe sometimes returns a non-JSON error body — surface as raw text */
  }
  if (!res.ok) {
    throw new Error(
      `PhonePe ${method} ${path} ${res.status}: ${json?.message || text || res.statusText}`,
    )
  }
  return json
}

/* ── Provider interface ───────────────────────────────────────────── */

/**
 * Create a PG v2 checkout. The merchantOrderId is our order _id — Mongo
 * ObjectIds are 24 hex chars, well under PhonePe's 63-char limit.
 *
 * `redirectUrl` is where the customer's browser lands after the PhonePe
 * page. We include the order id as a query param so /order/processing
 * can call /verify with the right order.
 */
export async function createCheckout(order) {
  const SITE =
    process.env.PUBLIC_SITE_URL ||
    (process.env.CLIENT_URL || '').split(',')[0]?.trim() ||
    'https://www.nuit.in'
  const merchantOrderId = order._id.toString()
  const redirectUrl = `${SITE.replace(/\/+$/, '')}/order/processing?orderId=${merchantOrderId}`

  const result = await pgFetch('POST', '/checkout/v2/pay', {
    merchantOrderId,
    amount: Math.round(order.total * 100), // paise
    paymentFlow: {
      type: 'PG_CHECKOUT',
      merchantUrls: { redirectUrl },
    },
  })

  order.phonepeMerchantOrderId = merchantOrderId
  await order.save()

  return {
    provider: 'phonepe',
    phonepe: {
      redirectUrl: result.redirectUrl,
      merchantOrderId,
      orderId: result.orderId, // PhonePe's own order id (informational)
    },
  }
}

/**
 * Verify after the redirect — the browser has no signature to give us, so
 * we hit PhonePe's status API. This IS the source of truth.
 */
export async function verifyClientCallback(order, _body) {
  const status = await statusFor(order)
  return status
}

/**
 * Status check — extracts the transaction id when COMPLETED, or flags
 * `pending: true` when PhonePe is still processing. Pending is a real
 * case here because the browser-redirect can beat the status API by a
 * few seconds.
 */
async function statusFor(order) {
  const merchantOrderId =
    order.phonepeMerchantOrderId || order._id.toString()
  const result = await pgFetch(
    'GET',
    `/checkout/v2/order/${merchantOrderId}/status`,
  )
  const state = result?.state
  const tx = (result?.paymentDetails || []).find((p) => p.state === 'COMPLETED')
  if (state === 'COMPLETED') {
    return { valid: true, paymentId: tx?.transactionId || '' }
  }
  if (state === 'PENDING') {
    return { valid: false, paymentId: '', pending: true }
  }
  return { valid: false, paymentId: '' }
}

/**
 * Webhook auth: PhonePe sends Authorization = SHA256(username:password).
 * We compare against the configured pair (set in the PhonePe portal AND
 * mirrored into env). Any mismatch is rejected.
 */
export async function verifyWebhook(req) {
  const { webhookUsername: u, webhookPassword: p } = PHONEPE
  if (!u || !p) {
    console.warn('🔒 [phonepe webhook] creds missing in env — rejecting all calls', {
      hasUsername: Boolean(u),
      hasPassword: Boolean(p),
    })
    return { valid: false, event: '', providerOrderId: '', paymentId: '' }
  }
  const expected = crypto.createHash('sha256').update(`${u}:${p}`).digest('hex')
  const got = req.headers['authorization'] || ''
  if (got !== expected) {
    // TEMP — log the auth check while we're testing. Show only the FIRST
    // 8 chars of each hash so the secrets stay out of logs.
    console.warn('🔒 [phonepe webhook] AUTH MISMATCH', {
      expectedPrefix: expected.slice(0, 8) + '…',
      gotPrefix: got ? got.slice(0, 8) + '…' : '(empty)',
      gotLength: got.length,
    })
    return { valid: false, event: '', providerOrderId: '', paymentId: '' }
  }
  const { event, payload } = req.body || {}
  console.log('✅ [phonepe webhook] auth OK · event:', event)
  const tx = (payload?.paymentDetails || []).find(
    (pd) => pd.state === 'COMPLETED',
  )
  return {
    valid: true,
    event, // 'checkout.order.completed' | 'checkout.order.failed' | ...
    providerOrderId: payload?.merchantOrderId || '',
    paymentId: tx?.transactionId || '',
  }
}

/** Admin re-check — same status call, mapped to our paid/failed/pending verdict. */
export async function recheckStatus(order) {
  if (!order.phonepeMerchantOrderId) return 'pending'
  try {
    const result = await pgFetch(
      'GET',
      `/checkout/v2/order/${order.phonepeMerchantOrderId}/status`,
    )
    const state = result?.state
    const expectedPaise = Math.round(order.total * 100)
    const amountOk = !result?.amount || result.amount === expectedPaise
    if (state === 'COMPLETED' && amountOk) return 'paid'
    if (state === 'FAILED') return 'failed'
    return 'pending'
  } catch (err) {
    console.error('[phonepe] recheck failed:', err.message)
    return 'pending'
  }
}

/** Dispatcher hook — look up an order from a webhook's merchantOrderId. */
export const findOrderByWebhook = (Order, providerOrderId) =>
  Order.findOne({ phonepeMerchantOrderId: providerOrderId })

/** Stamp the verified payment id onto the right field. */
export function stampPaymentId(order, paymentId) {
  order.phonepeTransactionId = paymentId
}

/** Test-only: clear the cached token between tests. */
export function _clearTokenCache() {
  cachedToken = null
}
