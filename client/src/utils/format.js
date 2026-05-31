// Indian-grouped number formatting (e.g. 150000 → "1,50,000").
const inrNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

// "₹ 849" — symbol + a non-breaking space so the price never wraps
// apart across lines.
export const formatPrice = (amount) => `₹ ${inrNumber.format(amount || 0)}`

/**
 * What the customer is actually charged for a variant — the discount if
 * one is set AND below the MRP, otherwise the MRP itself. Mirrors the
 * server-side rule in server/src/models/Product.js → effectiveVariantPrice.
 */
export const effectivePrice = (variant) => {
  const dp = variant?.discountedPrice
  if (dp != null && dp > 0 && dp < variant.price) return dp
  return variant?.price ?? 0
}

/** True if a variant is actively discounted (display the strikethrough). */
export const isDiscounted = (variant) =>
  variant?.discountedPrice != null &&
  variant.discountedPrice > 0 &&
  variant.discountedPrice < variant.price

/**
 * Rounded whole-percent saving on a variant, or 0 when no discount applies.
 * E.g. MRP 999 → ₹ 699 yields 30 (for "30% off"). Rounded for display.
 */
export const discountPercent = (variant) => {
  if (!isDiscounted(variant)) return 0
  return Math.round(
    ((variant.price - variant.discountedPrice) / variant.price) * 100,
  )
}
