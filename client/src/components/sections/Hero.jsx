import { Link } from 'react-router-dom'
import Placeholder from '../ui/Placeholder'
import Button from '../ui/Button'

/**
 * The "Quiet Gallery" hero — a full-viewport tonal field with
 * minimal, bottom-anchored type. Entrance is one orchestrated
 * sequence: each element fades up on a staggered delay.
 */
export default function Hero() {
  return (
    <section id="top" className="relative min-h-screen overflow-hidden">
      {/* Full-bleed image stand-in */}
      <Placeholder
        tone="deep"
        mark={false}
        className="absolute inset-0 h-full w-full"
      />
      {/* Scrims — keep type legible top (header) and bottom (headline) */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-transparent to-ink/75" />

      {/* Editorial vertical label */}
      <span className="eyebrow absolute right-7 top-1/2 hidden -translate-y-1/2 rotate-90 text-[0.625rem] text-canvas/40 lg:block">
        Est. 2024 — Sleep well
      </span>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-6 pb-16 pt-40">
        <p
          className="eyebrow animate-fade-up text-canvas/70"
          style={{ animationDelay: '0.2s' }}
        >
          The Autumn Collection
        </p>

        <h1
          className="animate-fade-up mt-6 max-w-4xl font-display text-[clamp(2.75rem,7vw,5.75rem)] font-light leading-[1.03] tracking-[-0.02em] text-canvas"
          style={{ animationDelay: '0.35s' }}
        >
          Quiet hours,
          <br />
          <span className="text-greige">beautifully dressed.</span>
        </h1>

        <p
          className="animate-fade-up mt-7 max-w-md text-sm leading-relaxed text-canvas/65"
          style={{ animationDelay: '0.55s' }}
        >
          Sleepwear and intimates cut from fabrics that disappear on the
          skin — designed for rest, not for show.
        </p>

        <div
          className="animate-fade-up mt-10 flex flex-wrap items-center gap-x-9 gap-y-4"
          style={{ animationDelay: '0.7s' }}
        >
          <Button as={Link} to="/shop" variant="light">
            Explore the collection
          </Button>
          <a
            href="#new"
            className="eyebrow text-canvas/70 transition-colors hover:text-canvas"
          >
            New this week →
          </a>
        </div>

        <div className="mt-14 flex items-center justify-between border-t border-canvas/15 pt-6">
          <span className="eyebrow text-[0.625rem] text-canvas/45">
            Scroll to discover
          </span>
          <span className="eyebrow text-[0.625rem] text-canvas/45">
            ( 01 — 04 )
          </span>
        </div>
      </div>
    </section>
  )
}
