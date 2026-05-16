import { Link } from 'react-router-dom'
import { categories } from '../../data/categories'
import Reveal from '../ui/Reveal'

/**
 * The irregular gallery grid — one tall feature tile (Nightwear)
 * plus three supporting tiles. The asymmetry is what stops this
 * reading as a stock 4-up category row.
 */
export default function CategoryGallery() {
  return (
    <section
      id="categories"
      className="mx-auto flex min-h-[calc(100vh-var(--header-height))] max-w-7xl flex-col justify-center px-6 py-16"
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

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-12 md:grid-rows-2">
        {categories.map((cat, i) => (
          <Reveal
            key={cat.id}
            as={Link}
            to={`/shop?category=${cat.id}`}
            delay={i * 90}
            className={`group relative block h-72 overflow-hidden md:h-auto ${cat.span}`}
          >
            <img
              src={cat.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/5 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-7 text-canvas">
              <h3 className="font-display text-2xl font-light md:text-[1.75rem]">
                {cat.name}
              </h3>
              <span className="eyebrow mt-4 inline-flex items-center gap-2 text-[0.625rem] text-canvas/80">
                <span className="h-px w-6 bg-canvas/50 transition-all duration-500 group-hover:w-10 group-hover:bg-dusk" />
                Shop now
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
