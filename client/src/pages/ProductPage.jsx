import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getProduct } from '../services/productApi'
import { addItem, selectCartItems } from '../features/cart/cartSlice'
import {
  formatPrice,
  effectivePrice,
  isDiscounted,
  discountPercent,
} from '../utils/format'
import { productPath, productIdFromSlug } from '../utils/slug'
import { useDocumentMeta } from '../utils/useDocumentMeta'
import { categories } from '../data/categories'

/** Lookup the customer-facing category name from its id (or empty). */
const categoryName = (id) => categories.find((c) => c.id === id)?.name || ''

/**
 * SEO description for a product page — aimed at the 120–155 char sweet
 * spot Google uses for SERP snippets. Prefers the merchandiser's own
 * description (trimmed at a word boundary); falls back to a template
 * using name, company and category so every product has a meaningful
 * meta description even when the admin hasn't written one.
 */
function buildProductDescription(product) {
  const intro = product.description?.trim()
  if (intro && intro.length >= 60) {
    if (intro.length <= 155) return intro
    return intro.slice(0, 155).replace(/\s+\S*$/, '') + '…'
  }
  const cat = categoryName(product.category).toLowerCase()
  const company = product.company ? ` by ${product.company}` : ''
  const piece = cat ? ` ${cat}` : ''
  return `Shop ${product.name}${company} — soft, considered${piece} at nuit. Free delivery on Indian orders over ₹2,000.`
}
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Placeholder from '../components/ui/Placeholder'
import ImageLightbox from '../components/product/ImageLightbox'

export default function ProductPage() {
  // The route param is `slug` — either a rich "name-id" slug or, for old
  // bookmarks/email links, a bare 24-hex ObjectId. Either way the ID is the
  // trailing 24 hex chars, which is what we actually fetch by.
  const { slug } = useParams()
  const id = productIdFromSlug(slug)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const cartItems = useSelector(selectCartItems)

  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  // Variant selection. For bras `size` holds the band and `cup` the cup;
  // for everything else `cup` stays null.
  const [colorIndex, setColorIndex] = useState(0)
  const [size, setSize] = useState(null)
  const [cup, setCup] = useState(null)
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [hint, setHint] = useState('')
  const [added, setAdded] = useState(false)
  // Image lightbox — opened by clicking the main hero photo.
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    // No 24-hex tail in the URL → no real product to load. Render error.
    if (!id) {
      setError('Product not found.')
      setStatus('error')
      return
    }
    setStatus('loading')
    getProduct(id)
      .then((p) => {
        setProduct(p)
        setStatus('ready')
        // Canonicalise the URL: if the visitor arrived on a bare ID or a
        // stale slug, rewrite the address bar to the slugged form. We
        // `replace` rather than push so the browser back button doesn't
        // land on the old URL, and so Google treats the slugged URL as
        // canonical when it executes the page's JS.
        const canonical = productPath(p)
        if (canonical !== `/product/${slug}`) {
          navigate(canonical, { replace: true })
        }
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [id, slug, navigate])

  /**
   * Per-product <title>, <meta description> and matching OG/Twitter
   * tags. Googlebot executes JS and reads these for SERP titles +
   * snippets, so a customer searching "long cotton nightdress" sees a
   * useful, product-specific title in the result. Empty until the
   * product loads (the index.html defaults are still in place).
   */
  const productCover =
    product?.images?.[0] || product?.colors?.[0]?.images?.[0] || ''
  useDocumentMeta({
    title: product
      ? `${product.name}${product.company ? ` — ${product.company}` : ''} | nuit`
      : undefined,
    description: product ? buildProductDescription(product) : undefined,
    url: product
      ? `${window.location.origin}${productPath(product)}`
      : undefined,
    image: productCover || undefined,
  })

  /**
   * Set a <link rel="canonical"> in the document head pointing at the
   * slugged URL — derived from the LOADED product (not the URL the
   * customer arrived on), so a bare-id arrival still advertises the
   * slugged form as canonical. This is the strongest SEO signal for
   * consolidating link equity onto one URL; Google reads it even
   * without executing the JS-driven replaceState above.
   *
   * Cleaned up on unmount so navigating to another page doesn't leave
   * this product's URL hanging as the canonical for the next page.
   */
  useEffect(() => {
    if (!product) return undefined
    const canonicalUrl = `${window.location.origin}${productPath(product)}`
    let link = document.querySelector('link[rel="canonical"]')
    const created = !link
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = canonicalUrl
    return () => {
      if (created && link.parentNode) link.parentNode.removeChild(link)
    }
  }, [product])

  // Changing colour resets the dependent selections.
  useEffect(() => {
    setSize(null)
    setCup(null)
    setActiveImage(0)
    setQty(1)
    setHint('')
    setAdded(false)
  }, [colorIndex])

  /* ── Loading / error shells ── */
  if (status !== 'ready') {
    return (
      <>
        <Header solid surface="white" border={false} />
        <main className="flex min-h-screen items-center justify-center bg-white pt-24">
          <p className={`text-sm ${status === 'error' ? 'text-dusk' : 'text-clay'}`}>
            {status === 'error' ? error : 'Loading…'}
          </p>
        </main>
      </>
    )
  }

  /* ── Derived variant data ── */
  const colors = product.colors || []
  const color = colors[colorIndex]
  const gallery = (color?.images?.length ? color.images : product.images) || []
  const sizes = color?.sizes || []
  // Bras are two-axis (band × cup): any variant carrying a cup flags it.
  const isBra = sizes.some((s) => s.cup)
  const selectedVariant = sizes.find(
    (s) => s.size === size && (s.cup || '') === (cup || ''),
  )
  // Bra bands, in stored order (variants are saved band-then-cup); and the
  // cups available for the chosen band.
  const bands = isBra
    ? sizes.reduce(
        (acc, s) => (acc.includes(s.size) ? acc : [...acc, s.size]),
        [],
      )
    : []
  const cupsForBand = isBra ? sizes.filter((s) => s.size === size) : []

  const allVariants = colors.flatMap((c) => c.sizes)
  const effectives = allVariants.map((v) => effectivePrice(v))
  const min = effectives.length ? Math.min(...effectives) : 0
  const max = effectives.length ? Math.max(...effectives) : 0
  // The "headline" — what is currently charged for the chosen variant, or
  // the effective range when nothing's chosen.
  const priceDisplay = selectedVariant
    ? formatPrice(effectivePrice(selectedVariant))
    : min === max
      ? formatPrice(min)
      : `${formatPrice(min)} – ${formatPrice(max)}`
  // MRP + Save% surface only once the customer has picked a variant — the
  // header range stays clean before that.
  const showStrike = selectedVariant && isDiscounted(selectedVariant)
  const savePercent = showStrike ? discountPercent(selectedVariant) : 0

  const handleAdd = () => {
    if (!size) return setHint(isBra ? 'Please select a band' : 'Please select a size')
    if (isBra && !cup) return setHint('Please select a cup')
    if (!selectedVariant || selectedVariant.stock < 1) {
      return setHint('That size is out of stock')
    }
    // Don't let cart quantity exceed what's in stock for this variant.
    const lineId = `${product._id}__${color.name}__${size}__${cup || ''}`
    const inCart = cartItems.find((i) => i.lineId === lineId)?.quantity || 0
    if (inCart + qty > selectedVariant.stock) {
      return setHint(
        inCart > 0
          ? `Only ${selectedVariant.stock} in stock — you already have ${inCart} in your bag`
          : `Only ${selectedVariant.stock} left in stock`,
      )
    }
    dispatch(
      addItem({
        productId: product._id,
        name: product.name,
        company: product.company,
        // The cover photo (same one the shop grid shows), not the
        // selected colour's variant shot.
        image:
          product.images?.[0] || product.colors?.[0]?.images?.[0] || '',
        color: color.name,
        hex: color.hex,
        size,
        cup: cup || '',
        // Charge the effective price; carry the MRP only when discounted.
        price: effectivePrice(selectedVariant),
        mrp: isDiscounted(selectedVariant) ? selectedVariant.price : null,
        quantity: qty,
      }),
    )
    setHint('')
    setAdded(true)
  }

  return (
    <>
      <Header solid surface="white" border={false} />

      <main className="min-h-screen bg-white px-6 pb-24 pt-24">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-24">
          {/* ── Gallery — fixed width; thumbnail rail beside the image ── */}
          <div className="flex flex-col gap-3 lg:w-[35rem] lg:shrink-0 lg:flex-row lg:gap-7">
            {/* Thumbnails: a row below on mobile, a left rail on desktop */}
            {gallery.length > 1 && (
              <div className="order-2 flex gap-3 lg:order-1 lg:flex-col">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`h-24 w-20 shrink-0 overflow-hidden border transition-colors ${
                      i === activeImage ? 'border-ink' : 'border-linen'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main image — clicking it opens the lightbox for a zoomed
                view. `cursor-zoom-in` is the only affordance; an overlay
                badge would clutter the editorial photography. */}
            <div className="order-1 min-w-0 flex-1 lg:order-2">
              {gallery[activeImage] ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label="View larger image"
                  className="block w-full cursor-zoom-in"
                >
                  <img
                    src={gallery[activeImage]}
                    alt={product.name}
                    className="block w-full"
                  />
                </button>
              ) : (
                <Placeholder tone="mid" className="aspect-[3/4] w-full" />
              )}
            </div>
          </div>

          {/* ── Details ── */}
          <div className="lg:w-[36rem] lg:shrink-0">
            <p className="eyebrow text-clay">{product.company}</p>
            <h1 className="mt-2 font-display text-3xl font-light tracking-tight text-ink md:text-4xl">
              {product.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <p className="text-lg text-ink">{priceDisplay}</p>
              {showStrike && (
                <>
                  <p className="text-sm text-greige line-through">
                    {formatPrice(selectedVariant.price)}
                  </p>
                  <p className="eyebrow text-xs text-dusk">
                    Save {savePercent}%
                  </p>
                </>
              )}
            </div>

            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-clay">
                {product.description}
              </p>
            )}

            <div className="my-8 border-t border-linen" />

            {colors.length === 0 ? (
              <p className="text-sm text-clay">
                This piece isn't available to order yet.
              </p>
            ) : (
              <>
                {/* Colour */}
                <div>
                  <p className="eyebrow text-clay">
                    Colour{color ? ` — ${color.name}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {colors.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setColorIndex(i)}
                        aria-label={c.name}
                        title={c.name}
                        style={{ backgroundColor: c.hex }}
                        className={`h-9 w-9 rounded-full transition-all ${
                          i === colorIndex
                            ? 'ring-1 ring-ink ring-offset-2 ring-offset-white'
                            : 'ring-1 ring-linen'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Size — bras pick band then cup; everything else one size */}
                {isBra ? (
                  <>
                    <div className="mt-7">
                      <p className="eyebrow text-clay">Band</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {bands.map((b) => {
                          const inStock = sizes.some(
                            (s) => s.size === b && s.stock > 0,
                          )
                          const selected = b === size
                          return (
                            <button
                              key={b}
                              type="button"
                              disabled={!inStock}
                              onClick={() => {
                                setSize(b)
                                setCup(null)
                                setHint('')
                                setAdded(false)
                                setQty(1)
                              }}
                              className={`h-11 min-w-11 px-3 border text-xs transition-colors ${
                                selected
                                  ? 'border-ink bg-ink text-canvas'
                                  : !inStock
                                    ? 'cursor-not-allowed border-linen text-greige line-through'
                                    : 'border-ink/30 text-ink hover:border-ink'
                              }`}
                            >
                              {b}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {size && (
                      <div className="mt-6">
                        <p className="eyebrow text-clay">Cup</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {cupsForBand.map((s) => {
                            const oos = s.stock < 1
                            const selected = s.cup === cup
                            return (
                              <button
                                key={s.cup}
                                type="button"
                                disabled={oos}
                                onClick={() => {
                                  setCup(s.cup)
                                  setHint('')
                                  setAdded(false)
                                  setQty(1)
                                }}
                                className={`h-11 min-w-11 px-3 border text-xs transition-colors ${
                                  selected
                                    ? 'border-ink bg-ink text-canvas'
                                    : oos
                                      ? 'cursor-not-allowed border-linen text-greige line-through'
                                      : 'border-ink/30 text-ink hover:border-ink'
                                }`}
                              >
                                {s.cup}
                              </button>
                            )
                          })}
                        </div>
                        {selectedVariant &&
                          selectedVariant.stock > 0 &&
                          selectedVariant.stock <= 5 && (
                            <p className="mt-2 text-xs text-dusk">
                              Only {selectedVariant.stock} left
                            </p>
                          )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-7">
                    <p className="eyebrow text-clay">Size</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sizes.map((s) => {
                        const oos = s.stock < 1
                        const selected = s.size === size
                        return (
                          <button
                            key={s.size}
                            type="button"
                            disabled={oos}
                            onClick={() => {
                              setSize(s.size)
                              setHint('')
                              setAdded(false)
                              setQty(1)
                            }}
                            className={`h-11 min-w-11 px-3 border text-xs transition-colors ${
                              selected
                                ? 'border-ink bg-ink text-canvas'
                                : oos
                                  ? 'cursor-not-allowed border-linen text-greige line-through'
                                  : 'border-ink/30 text-ink hover:border-ink'
                            }`}
                          >
                            {s.size}
                          </button>
                        )
                      })}
                    </div>
                    {selectedVariant &&
                      selectedVariant.stock > 0 &&
                      selectedVariant.stock <= 5 && (
                        <p className="mt-2 text-xs text-dusk">
                          Only {selectedVariant.stock} left
                        </p>
                      )}
                  </div>
                )}

                {/* Quantity */}
                <div className="mt-7">
                  <p className="eyebrow text-clay">Quantity</p>
                  <div className="mt-3 flex w-fit items-center border border-ink/30">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm text-ink">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQty((q) =>
                          Math.min(q + 1, selectedVariant?.stock ?? 99),
                        )
                      }
                      className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Add to bag */}
                <div className="mt-8">
                  <Button
                    onClick={handleAdd}
                    variant="solid"
                    className="w-full"
                  >
                    {added ? 'Added to bag ✓' : 'Add to bag'}
                  </Button>
                  {hint && <p className="mt-3 text-xs text-dusk">{hint}</p>}
                  {added && (
                    <Link
                      to="/cart"
                      className="eyebrow mt-3 inline-block text-clay transition-colors hover:text-ink"
                    >
                      View bag →
                    </Link>
                  )}
                </div>
              </>
            )}

            {product.fabric && (
              <p className="mt-8 text-xs text-clay">Fabric — {product.fabric}</p>
            )}
          </div>
        </div>
      </main>

      {/* Image lightbox — sits at the page root so its `fixed` positioning
          is never affected by main's stacking context. Renders only when
          opened to avoid running the scroll-lock effect on every page load. */}
      {lightboxOpen && gallery.length > 0 && (
        <ImageLightbox
          images={gallery}
          initialIndex={activeImage}
          alt={product.name}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
