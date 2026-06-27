import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Placeholder from '../ui/Placeholder'
import Button from '../ui/Button'

/*
 ┌─────────────────────────────────────────────────────────────────────┐
 │ ADD HERO IMAGES HERE                                                │
 │                                                                     │
 │ Drop your hero JPGs/PNGs into                                       │
 │   client/src/assets/hero/                                           │
 │ (create the folder if it doesn't exist).                            │
 │                                                                     │
 │ Then uncomment the matching import below and add the `src:` to each │
 │ SLIDES entry. Slides without a `src` render the brand Placeholder   │
 │ until you replace them, so you can ship the carousel partially.     │
 └─────────────────────────────────────────────────────────────────────┘
*/
import hero1 from '../../assets/hero/img1.png'
import hero2 from '../../assets/hero/img2.png'
import hero3 from '../../assets/hero/img3.png'
import hero4 from '../../assets/hero/img4.jpg'

/**
 * Slides for the hero carousel. Keep these 1-6 in length — beyond six,
 * the bar-pagination starts feeling crowded and customers stop seeing
 * the later slides anyway. `eyebrow` is optional — when omitted, the
 * shared default below is used.
 *
 * A null `src` is intentional: the Placeholder renders in that slot
 * until you swap in a real image. Useful for previewing the carousel
 * mechanic before all photography is shot.
 */
// `theme: 'light'` — for slides whose image is bright/cream, so the
// overlaid text flips from canvas/greige (light) to ink/clay (dark) for
// legibility. Same value-scale relationship, opposite base colour.
const SLIDES = [
  { src: hero1, alt: 'Autumn — first look' },
  { src: hero2, alt: 'Cotton cordsets' },
  { src: hero3, alt: 'Soft-cup intimates' },
  { src: hero4, alt: 'Quiet evenings' },
]

const AUTOPLAY_MS = 4_000
const FADE_MS = 700

/**
 * The "Quiet Gallery" hero — a slow crossfade between hero photos with
 * the brand copy held statically over them. Editorial feel; no chunky
 * carousel chrome (no chevrons, no circular dots — the indicator is
 * typography and four thin bars, both brand-aligned).
 *
 * Behaviour:
 *  - Auto-advances every AUTOPLAY_MS, with FADE_MS crossfades.
 *  - Pauses on hover (desktop) and while the tab is hidden.
 *  - Respects `prefers-reduced-motion` — no auto-advance.
 *  - Bars at the bottom-right are clickable to jump to a slide.
 *  - The bottom-right `(01 — 04)` counter updates dynamically.
 */
export default function Hero() {
  const [index, setIndex] = useState(0)
  const [tabHidden, setTabHidden] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  // We auto-advance unless: the tab is in the background, the OS asks
  // for reduced motion, or there's only one slide. We intentionally do
  // NOT pause on hover — the hero is min-h-screen so the cursor is on
  // it almost all the time after page load; pause-on-hover would mean
  // the carousel almost never animates in practice.
  const shouldAdvance = !tabHidden && !reducedMotion && SLIDES.length > 1

  // Honour the OS's reduce-motion setting.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Pause when the tab is hidden so we don't burn through the
  // pagination while the customer isn't looking.
  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Auto-advance. Re-running the effect when `index` changes resets the
  // timer cleanly when the customer jumps via the bars.
  const timer = useRef(null)
  useEffect(() => {
    if (!shouldAdvance) return undefined
    timer.current = setTimeout(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      AUTOPLAY_MS,
    )
    return () => clearTimeout(timer.current)
  }, [index, shouldAdvance])

  // Per-slide theme — drives every text / border / button class below.
  // `transition-colors` on each themed element + a duration matching the
  // image crossfade means the colour flip and the photo swap arrive in
  // sync; the change never feels snappy or two-stage.
  const isLight = SLIDES[index]?.theme === 'light'
  const c = {
    // Dark-theme scrim is a real vignette (dark-over-anything reads as
    // intentional shadow). Light-theme is a different visual problem —
    // canvas-over-light desaturates the photo and looks like dirty haze.
    // So light theme gets only a whisper of bottom lift to keep dark
    // text legible if it lands on a low-contrast patch, nothing more.
    scrim: isLight
      ? 'from-transparent via-transparent to-canvas/20'
      : 'from-ink/55 via-transparent to-ink/75',
    // Light theme opacity values are pushed harder than the dark-theme
    // mirror because warm-cream photo backgrounds reduce ink/clay
    // contrast more than ink-dark backgrounds reduce canvas/greige
    // contrast. Same primary/secondary value distance, just shifted.
    text: isLight ? 'text-ink' : 'text-canvas',
    textAlt: isLight ? 'text-ink/65' : 'text-greige',
    text70: isLight ? 'text-ink/80' : 'text-canvas/70',
    text65: isLight ? 'text-ink/85' : 'text-canvas/65',
    text45: isLight ? 'text-ink/60' : 'text-canvas/45',
    text40: isLight ? 'text-ink/55' : 'text-canvas/40',
    border: isLight ? 'border-ink/25' : 'border-canvas/15',
    barActive: isLight ? 'bg-ink/90' : 'bg-canvas/85',
    barIdle: isLight ? 'bg-ink/40' : 'bg-canvas/30',
    barHover: isLight ? 'hover:bg-ink/65' : 'hover:bg-canvas/55',
    hoverText: isLight ? 'hover:text-ink' : 'hover:text-canvas',
  }
  const buttonVariant = isLight ? 'solid' : 'light'

  return (
    <section
      id="top"
      className="relative min-h-screen snap-start snap-always overflow-hidden"
    >
      {/* Slide stack — all slides absolutely stacked, only one opaque at
          a time. Long crossfade (1.5s) keeps the change feeling like a
          magazine page turn rather than a popup. */}
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          aria-hidden={i !== index}
          className="absolute inset-0 transition-opacity ease-out"
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        >
          {slide.src ? (
            <img
              src={slide.src}
              alt={slide.alt || ''}
              className="h-full w-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              // First slide gets fetchpriority high so the LCP image
              // beats the rest in the network queue.
              fetchpriority={i === 0 ? 'high' : 'low'}
              draggable={false}
            />
          ) : (
            <Placeholder
              tone="deep"
              mark={false}
              className="absolute inset-0 h-full w-full"
            />
          )}
        </div>
      ))}

      {/* Scrim — biases the image toward the text colour at the edges
          (dark for canvas text; light for ink text). Crossfades along
          with the slide change so the value field transitions cleanly. */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b transition-colors duration-700 ${c.scrim}`}
      />

      {/* Editorial vertical label */}
      <span
        className={`eyebrow absolute right-7 top-1/2 hidden -translate-y-1/2 rotate-90 text-[0.625rem] transition-colors duration-700 lg:block ${c.text40}`}
      >
        Est. 1999 — Sleep well
      </span>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-6 pb-16 pt-40">
        <h1
          className={`animate-fade-up max-w-4xl font-display text-[clamp(2.75rem,7vw,5.75rem)] font-light leading-[1.03] tracking-[-0.02em] transition-colors duration-700 ${c.text}`}
          style={{ animationDelay: '0.35s' }}
        >
          Quiet hours,
          <br />
          <span className={`transition-colors duration-700 ${c.textAlt}`}>
            beautifully dressed.
          </span>
        </h1>

        <p
          className={`animate-fade-up mt-7 max-w-md text-sm leading-relaxed transition-colors duration-700 ${c.text65}`}
          style={{ animationDelay: '0.55s' }}
        >
          Sleepwear and intimates cut from fabrics that disappear on the
          skin — designed for rest, not for show.
        </p>

        <div
          className="animate-fade-up mt-10 flex flex-wrap items-center gap-x-9 gap-y-4"
          style={{ animationDelay: '0.7s' }}
        >
          <Button as={Link} to="/shop" variant={buttonVariant}>
            Explore the collection
          </Button>
          <a
            href="#new"
            className={`eyebrow transition-colors duration-700 ${c.text70} ${c.hoverText}`}
          >
            New this week →
          </a>
        </div>

        <div
          className={`mt-14 flex flex-wrap items-center justify-between gap-y-4 border-t pt-6 transition-colors duration-700 ${c.border}`}
        >
          <span
            className={`eyebrow text-[0.625rem] transition-colors duration-700 ${c.text45}`}
          >
            Scroll to discover
          </span>

          {/* Pagination — bars only (clickable). Counter intentionally
              removed for a cleaner editorial bottom strip. */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-px w-7 cursor-pointer transition-all duration-500 ${
                  i === index ? `${c.barActive} h-[2px]` : `${c.barIdle} ${c.barHover}`
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
