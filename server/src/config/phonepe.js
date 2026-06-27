/**
 * PhonePe PG v2 (OAuth) config. Switches by NODE_ENV the same way Razorpay does:
 *   production → PHONEPE_PROD_*, anything else → PHONEPE_DEV_*.
 *
 * Sandbox + production use different hosts AND different OAuth paths, which
 * is why the auth URL is configured separately from the API base. Defaults
 * cover the standard PhonePe hosts; override the env if PhonePe ever points
 * you at a different cluster.
 *
 * Webhook auth uses the username + password you configure in the PhonePe
 * portal. PhonePe sends them as `Authorization: SHA256(username:password)`
 * on every callback POST.
 */
const isProd = process.env.NODE_ENV === 'production'

const env = (key) => process.env[isProd ? `PHONEPE_PROD_${key}` : `PHONEPE_DEV_${key}`]

const DEFAULT_API_BASE = isProd
  ? 'https://api.phonepe.com/apis/pg'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox'

const DEFAULT_AUTH_URL = isProd
  ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'

export const PHONEPE = {
  clientId: env('CLIENT_ID'),
  clientSecret: env('SECRET'),
  clientVersion: env('CLIENT_VERSION') || '1',
  apiBase: env('API_BASE') || DEFAULT_API_BASE,
  authUrl: env('AUTH_URL') || DEFAULT_AUTH_URL,
  webhookUsername: env('WEBHOOK_USERNAME'),
  webhookPassword: env('WEBHOOK_PASSWORD'),
}

// Only warn when PhonePe is the actually-active provider — otherwise the
// merchant might be running pure Razorpay and never plans to set these.
const active = (process.env.PROVIDER || '').toUpperCase() === 'PHONEPE'
if (active && (!PHONEPE.clientId || !PHONEPE.clientSecret)) {
  console.warn(
    `⚠ PhonePe ${isProd ? 'PROD' : 'DEV'} client_id / secret missing — checkout will fail until they are set.`,
  )
}
