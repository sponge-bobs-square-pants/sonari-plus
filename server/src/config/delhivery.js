/**
 * Delhivery API config. Credentials + base URL switch on the DEDICATED
 * `DELHIVERY_MODE` env var (NOT NODE_ENV) so shipping can be run against
 * Delhivery's staging cluster even while the rest of the app is fully in
 * production (Razorpay, PhonePe on prod keys). Full integration
 * reference: DELHIVERY.md.
 *
 *   DELHIVERY_MODE=production  → DELHIVERY_PROD_API_KEY + https://track.delhivery.com
 *   anything else (default)     → DELHIVERY_DEV_API_KEY  + https://staging-express.delhivery.com
 */
const isProd = process.env.DELHIVERY_MODE === 'production'

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
  // Shared secret WE define for the Scan Push webhook — Delhivery sends it
  // as the `x-delhivery-token` header on every scan POST so we can verify
  // the call is genuinely theirs (see DELHIVERY.md). Env-switched like the key.
  webhookToken: isProd
    ? process.env.DELHIVERY_PROD_WEBHOOK_TOKEN
    : process.env.DELHIVERY_DEV_WEBHOOK_TOKEN,
}

if (!DELHIVERY.token) {
  console.warn(
    `⚠ Delhivery token missing for DELHIVERY_MODE=${process.env.DELHIVERY_MODE || '(unset)'} — dispatch/tracking will fail until it is set.`,
  )
}

/** The auth header carried on every Delhivery API call. */
export const delhiveryAuthHeader = () => ({
  Authorization: `Token ${DELHIVERY.token}`,
})
