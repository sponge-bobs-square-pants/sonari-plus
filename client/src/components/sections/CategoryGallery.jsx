import { Link } from 'react-router-dom'
import { categories } from '../../data/categories'
import Reveal from '../ui/Reveal'

/**
 * Where each tile's caption sits — chosen per category so the text
 * lands on the photo's quiet space, not on the garment.
 */
const ALIGN = {
  'bottom-left': 'justify-end items-start text-left',
  'top-right': 'justify-start items-end text-right',
  'bottom-right': 'justify-end items-end text-right',
}

/**
 * Tile shadow, kept off the section's outer margins per tile:
 *  - `all`         — lifts the whole card (interior tiles).
 *  - `right`       — glow on the inner edge only (tall Cordset tile).
 *  - `no-bottom`   — top / left / right only (Bras sits on the bottom margin).
 *  - `top-left`    — top / left only (Panties is the bottom-right corner).
 *  - `bottom-left` — bottom / left only (Night suits is the top-right corner).
 */
const SHADOW = {
  all: 'shadow-[0_4px_22px_-12px_rgba(46,42,38,0.16)] hover:shadow-[0_12px_30px_-18px_rgba(46,42,38,0.3)]',
  right:
    'shadow-[24px_0_24px_-30px_rgba(46,42,38,0.34)] hover:shadow-[28px_0_26px_-32px_rgba(46,42,38,0.4)]',
  'no-bottom':
    'shadow-[0_-12px_24px_-16px_rgba(46,42,38,0.2)] hover:shadow-[0_-15px_26px_-18px_rgba(46,42,38,0.3)]',
  'top-left':
    'shadow-[-12px_-12px_24px_-16px_rgba(46,42,38,0.2)] hover:shadow-[-15px_-15px_26px_-18px_rgba(46,42,38,0.3)]',
  'bottom-left':
    'shadow-[-12px_12px_24px_-16px_rgba(46,42,38,0.2)] hover:shadow-[-15px_15px_26px_-18px_rgba(46,42,38,0.3)]',
}

/**
 * The irregular gallery grid — one tall feature tile (Cordset)
 * plus three supporting tiles. The asymmetry is what stops this
 * reading as a stock 4-up category row.
 */
export default function CategoryGallery() {
  return (
    <section
      id="categories"
      data-nav-surface="canvas"
      className="mx-auto flex min-h-screen max-w-7xl snap-start snap-always flex-col justify-center px-6 pb-16 pt-[var(--header-height)]"
    >
      <Reveal className="mb-8 flex items-end justify-between">
        <div>
          <p className="eyebrow text-clay">Shop by category</p>
        </div>
        <Link
          to="/shop"
          className="eyebrow hidden text-clay transition-colors hover:text-ink sm:block"
        >
          All categories →
        </Link>
      </Reveal>

      <div className="grid min-h-0 flex-1 gap-2.5 md:grid-cols-12 md:grid-rows-2">
        {/* Only categories with a `span` are homepage gallery tiles. */}
        {categories
          .filter((cat) => cat.span)
          .map((cat, i) => (
          <Reveal
            key={cat.id}
            as={Link}
            to={`/shop?category=${cat.id}`}
            delay={i * 90}
            className={`group relative block h-72 overflow-hidden bg-canvas transition-shadow duration-[600ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] md:h-auto ${
              SHADOW[cat.shadowEdge] ?? SHADOW.all
            } ${cat.span}`}
          >
            <img
              src={cat.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.06]"
            />
            <div
              className={`absolute inset-0 flex flex-col p-7 text-ink ${
                ALIGN[cat.align] ?? ALIGN['bottom-left']
              }`}
            >
              <h3 className="font-display text-2xl font-light md:text-[1.75rem]">
                {cat.name}
              </h3>
              <span className="eyebrow mt-4 inline-flex items-center gap-2 text-[0.625rem] text-ink/70">
                <span className="h-px w-6 bg-ink/40 transition-all duration-500 group-hover:w-10 group-hover:bg-dusk" />
                Shop now
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
