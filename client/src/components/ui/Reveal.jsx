import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Wraps content so it fades + rises into view the first time it
 * scrolls near the viewport. Pure CSS transition (see `.reveal` in
 * index.css) — this component only toggles the `is-visible` class.
 *
 * Props:
 *   as            — element/tag to render (default 'div')
 *   delay         — ms to stagger the reveal (for sequenced children)
 *   instantInView — if the element is ALREADY on screen at mount, show
 *                   it before the first paint (no fade, no flash).
 *                   Only genuinely below-the-fold elements then animate.
 *                   Use for grids/lists; leave off for scroll storytelling.
 */
export default function Reveal({
  as: Tag = 'div',
  delay = 0,
  instantInView = false,
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null)

  // Runs before paint: anything already in the viewport is marked
  // visible immediately, so it renders solid instead of fading in.
  useLayoutEffect(() => {
    if (!instantInView) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('is-visible')
    }
  }, [instantInView])

  useEffect(() => {
    const el = ref.current
    // Already shown by the layout effect above — nothing to watch.
    if (!el || el.classList.contains('is-visible')) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          observer.unobserve(el) // reveal once, then stop watching
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
