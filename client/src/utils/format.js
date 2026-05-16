// Indian-grouped number formatting (e.g. 150000 → "1,50,000").
const inrNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

// "₹ 849" — symbol + a non-breaking space so the price never wraps
// apart across lines.
export const formatPrice = (amount) => `₹ ${inrNumber.format(amount || 0)}`
