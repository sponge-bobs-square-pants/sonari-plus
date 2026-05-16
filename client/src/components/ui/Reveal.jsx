import { useEffect, useRef } from 'react'

/**
 * Wraps content so it fades + rises into view the first time it
 * scrolls near the viewport. Pure CSS transition (see `.reveal` in
 * index.css) — this component only toggles the `is-visible` class.
 *
 * Props:
 *   as       — element/tag to render (default 'div')
 *   delay    — ms to stagger the reveal (for sequenced children)
 */
export default function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

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
