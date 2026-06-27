import * as razorpay from './razorpay.js'
import * as phonepe from './phonepe.js'

/**
 * Payment provider dispatch.
 *
 * The orderController never imports a provider directly. It either asks for
 * the ACTIVE provider (used for new orders) or looks one up BY NAME (used
 * for an existing order's verify / re-check / webhook).
 *
 * This is what lets PROVIDER be flipped via env without stranding orders
 * that were created under the previous provider — every order carries its
 * own `provider` field, so its verify / webhook path stays sticky.
 */

const PROVIDERS = { razorpay, phonepe }

/**
 * Read the env PROVIDER and resolve it to a provider name. Accepts:
 *   PROVIDER=RAZORPAY | RAZERPAY | razorpay  → 'razorpay'
 *   PROVIDER=PHONEPE | phonepe              → 'phonepe'
 * Unknown / unset → defaults to 'razorpay' (the existing behaviour pre-PhonePe).
 */
export function activeProviderName() {
  const raw = (process.env.PROVIDER || '').trim().toUpperCase()
  // Accept the common typo "RAZERPAY" as a synonym for the canonical name.
  if (raw === 'PHONEPE') return 'phonepe'
  if (raw === 'RAZORPAY' || raw === 'RAZERPAY' || raw === '') return 'razorpay'
  console.warn(`⚠ Unknown PROVIDER=${raw} — falling back to razorpay`)
  return 'razorpay'
}

/** The provider for NEW orders. */
export function getActiveProvider() {
  return PROVIDERS[activeProviderName()]
}

/** The provider for an EXISTING order (sticks to whatever it was booked with). */
export function getProviderForOrder(order) {
  return PROVIDERS[order?.provider] || PROVIDERS.razorpay
}

/** Look up a provider by name. Used by the per-provider webhook handlers. */
export function getProviderByName(name) {
  return PROVIDERS[name] || null
}
