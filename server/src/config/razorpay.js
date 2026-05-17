import Razorpay from 'razorpay'

/**
 * Razorpay keys switch automatically by environment:
 *   - production  → RAZORPAY_PROD_KEY_ID / RAZORPAY_PROD_KEY_SECRET
 *   - anything else (development) → RAZORPAY_DEV_KEY_ID / _SECRET
 *
 * So deploying with NODE_ENV=production (and the prod keys uncommented
 * in the environment) flips the store to live payments — no code change.
 */
const isProd = process.env.NODE_ENV === 'production'

export const RAZORPAY_KEY_ID = isProd
  ? process.env.RAZORPAY_PROD_KEY_ID
  : process.env.RAZORPAY_DEV_KEY_ID

const RAZORPAY_KEY_SECRET = isProd
  ? process.env.RAZORPAY_PROD_KEY_SECRET
  : process.env.RAZORPAY_DEV_KEY_SECRET

// Webhook secret — set when creating the webhook in the Razorpay
// dashboard, then copied into the matching env var. Used to verify
// that incoming webhook calls genuinely come from Razorpay.
export const RAZORPAY_WEBHOOK_SECRET = isProd
  ? process.env.RAZORPAY_PROD_WEBHOOK_SECRET
  : process.env.RAZORPAY_DEV_WEBHOOK_SECRET

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn(
    `⚠ Razorpay keys missing for NODE_ENV=${process.env.NODE_ENV} — checkout will fail until they are set.`,
  )
}

// The configured client — used server-side to create orders.
export const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
})

// The secret is also needed raw, to verify payment signatures.
export { RAZORPAY_KEY_SECRET }
