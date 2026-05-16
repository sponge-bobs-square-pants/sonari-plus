import { Link } from 'react-router-dom'
import Placeholder from '../ui/Placeholder'
import { formatPrice } from '../../utils/format'

/**
 * Storefront product card — renders a product from the API.
 * The whole card links to the single-product page.
 *
 * The image keeps its NATURAL aspect ratio (`w-full`, auto height) —
 * so it's never cropped and never letterboxed. When there's no image
 * yet, a fixed-ratio tonal placeholder stands in.
 *
 * `featured` (used by "New this week") prefers the dedicated
 * featuredImage, falling back to the normal cover.
 */
export default function ProductCard({ product, featured = false }) {
  const cover =
    (featured && product.featuredImage) ||
    product.images?.[0] ||
    product.colors?.[0]?.images?.[0] ||
    null

  // Price: variants can differ — "from ₹X" when they do, flat "₹X" when not.
  const prices =
    product.colors?.flatMap((c) => c.sizes.map((s) => s.price)) || []
  const min = prices.length ? Math.min(...prices) : (product.priceFrom ?? 0)
  const max = prices.length ? Math.max(...prices) : min
  const priceLabel =
    min === max ? formatPrice(min) : `from ${formatPrice(min)}`

  const zoom =
    'transition-transform duration-[900ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.05]'

  return (
    <Link to={`/product/${product._id}`} className="group block">
      <div className="overflow-hidden bg-linen">
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            className={`block w-full ${zoom}`}
          />
        ) : (
          <Placeholder
            tone="mid"
            mark={false}
            className={`aspect-[3/4] w-full ${zoom}`}
          />
        )}
      </div>

      <div className="mt-4">
        <p className="eyebrow text-[0.5625rem] text-clay">{product.company}</p>
        <h3 className="mt-1.5 font-display text-base font-normal text-ink">
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-clay">{priceLabel}</p>
      </div>
    </Link>
  )
}
