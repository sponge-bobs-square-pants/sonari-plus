import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getProduct } from '../services/productApi'
import { addItem, selectCartItems } from '../features/cart/cartSlice'
import { formatPrice } from '../utils/format'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Placeholder from '../components/ui/Placeholder'

export default function ProductPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const cartItems = useSelector(selectCartItems)

  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  // Variant selection
  const [colorIndex, setColorIndex] = useState(0)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [hint, setHint] = useState('')
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setStatus('loading')
    getProduct(id)
      .then((p) => {
        setProduct(p)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [id])

  // Changing colour resets the dependent selections.
  useEffect(() => {
    setSize(null)
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
  const selectedVariant = sizes.find((s) => s.size === size)

  const allPrices = colors.flatMap((c) => c.sizes.map((s) => s.price))
  const min = allPrices.length ? Math.min(...allPrices) : 0
  const max = allPrices.length ? Math.max(...allPrices) : 0
  const priceDisplay = selectedVariant
    ? formatPrice(selectedVariant.price)
    : min === max
      ? formatPrice(min)
      : `${formatPrice(min)} – ${formatPrice(max)}`

  const handleAdd = () => {
    if (!size) return setHint('Please select a size')
    if (!selectedVariant || selectedVariant.stock < 1) {
      return setHint('That size is out of stock')
    }
    // Don't let cart quantity exceed what's in stock for this variant.
    const lineId = `${product._id}__${color.name}__${size}`
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
        price: selectedVariant.price,
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

            {/* Main image */}
            <div className="order-1 min-w-0 flex-1 lg:order-2">
              {gallery[activeImage] ? (
                <img
                  src={gallery[activeImage]}
                  alt={product.name}
                  className="block w-full"
                />
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
            <p className="mt-4 text-lg text-ink">{priceDisplay}</p>

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

                {/* Size */}
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
    </>
  )
}
