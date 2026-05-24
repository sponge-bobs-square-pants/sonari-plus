/**
 * Delhivery API config — credentials + base URL switch by NODE_ENV,
 * mirroring config/razorpay.js. Full integration reference: DELHIVERY.md.
 *
 *   production  → DELHIVERY_PROD_API_KEY + https://track.delhivery.com
 *   else (dev)  → DELHIVERY_DEV_API_KEY  + https://staging-express.delhivery.com
 */
const isProd = process.env.NODE_ENV === 'production'

export const DELHIVERY = {
  // Base for ALL APIs incl. tracking — staging-express (dev) / track (prod).
  baseUrl: isProd
    ? 'https://track.delhivery.com'
    : 'https://staging-express.delhivery.com',
  token: isProd
    ? process.env.DELHIVERY_PROD_API_KEY
    : process.env.DELHIVERY_DEV_API_KEY,
  // The account's client name — the `cl` param on the waybill API.
  client: process.env.DELHIVERY_CLIENT_ID || '',
  // The registered pickup warehouse name — MUST match Delhivery exactly,
  // else order creation / pickup reject it ("ClientWarehouse … does not
  // exist"). Override per-account via env.
  pickupWarehouse: process.env.DELHIVERY_PICKUP_WAREHOUSE || 'SONARI NIGHT WEAR',
}

if (!DELHIVERY.token) {
  console.warn(
    `⚠ Delhivery token missing for NODE_ENV=${process.env.NODE_ENV} — dispatch/tracking will fail until it is set.`,
  )
}

/** The auth header carried on every Delhivery API call. */
export const delhiveryAuthHeader = () => ({
  Authorization: `Token ${DELHIVERY.token}`,
})
