import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Resets scroll to the top on every navigation.
 *
 * Client-side routing doesn't reset scroll by default — without this,
 * opening a new page (or switching category) would land you at
 * whatever position the previous page was scrolled to.
 *
 * Watches `pathname` AND `search`, so switching `/shop?category=…`
 * counts as a navigation too. Renders nothing.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    // `instant` overrides the global `scroll-behavior: smooth` so the
    // page jumps to the top rather than animating up after it loads.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, search])

  return null
}
