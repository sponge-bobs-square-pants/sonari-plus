const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

/**
 * Loads the Razorpay Checkout script on demand and resolves once it's
 * ready (`true`) or failed (`false`). Safe to call repeatedly — the
 * script is only ever added once.
 */
export function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}
