import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  selectCartItems,
  selectCartTotal,
  removeItem,
  updateQuantity,
} from '../features/cart/cartSlice'
import { getProduct } from '../services/productApi'
import { displaySize } from '../data/categories'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Placeholder from '../components/ui/Placeholder'
import { formatPrice } from '../utils/format'
import { productPath } from '../utils/slug'
import { FREE_DELIVERY_THRESHOLD } from '../data/shipping'

/* ── Quantity stepper ─────────────────────────────
   Minus is disabled at 1 — removal is a deliberate, separate action.
   Plus is disabled at `max` — the variant's available stock. */
function QtyStepper({ value, max, onChange }) {
  const atMax = max != null && value >= max
  return (
    <div className="inline-flex items-center">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className="flex h-6 w-6 cursor-pointer items-center justify-center text-clay transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-clay"
      >
        −
      </button>
      <span className="w-6 text-center text-sm text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={atMax}
        aria-label="Increase quantity"
        className="flex h-6 w-6 cursor-pointer items-center justify-center text-clay transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-clay"
      >
        +
      </button>
    </div>
  )
}

/* ── One cart card — small: cover photo on top, compact details below.
   The card stays a fixed, modest width; the grid packs as many across
   a row as fit. ──*/
function CartCard({ item, cover, stock, onQty, onRemove }) {
  const atStockCap = stock != null && item.quantity >= stock
  return (
    <li className="flex w-[8.5rem] flex-col">
      <Link
        to={productPath(item)}
        className="block aspect-[3/4] w-full overflow-hidden bg-linen"
      >
        {cover ? (
          <img
            src={cover}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <Placeholder tone="mid" mark={false} className="h-full w-full" />
        )}
      </Link>

      <div className="mt-3">
        {/* One line — overflow clips to an ellipsis. */}
        <h3 className="truncate font-display text-sm font-normal text-ink">
          <Link
            to={productPath(item)}
            className="transition-colors hover:text-clay"
          >
            {item.name}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-clay">
          {[item.color, displaySize(item)].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-1.5 font-display text-sm font-light text-ink">
          {formatPrice(item.price * item.quantity)}
        </p>
        {item.mrp != null && item.mrp > item.price && (
          <p className="text-[0.625rem] text-greige line-through">
            {formatPrice(item.mrp * item.quantity)}
          </p>
        )}

        {/* Delete first, then quantity — one line */}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onRemove}
            className="eyebrow cursor-pointer text-[0.5625rem] text-clay transition-colors hover:text-dusk"
          >
            Delete
          </button>
          <QtyStepper value={item.quantity} max={stock} onChange={onQty} />
        </div>
        {atStockCap && (
          <p className="mt-1.5 text-[0.625rem] text-dusk">
            Only {stock} in stock
          </p>
        )}
      </div>
    </li>
  )
}

/* ── Empty bag ────────────────────────────────────*/
function EmptyBag() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <Icon name="bag" className="h-9 w-9 text-greige" />
      <h2 className="mt-6 font-display text-2xl font-light text-ink">
        Your bag is empty
      </h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-clay">
        Pieces you add will gather here, ready for checkout.
      </p>
      <Button as={Link} to="/shop" variant="outline" className="mt-8">
        Browse the collection
      </Button>
    </div>
  )
}

export default function CartPage() {
  const items = useSelector(selectCartItems)
  const subtotal = useSelector(selectCartTotal)
  const dispatch = useDispatch()

  // Cart lines are snapshots — fetch each product live so we can show
  // the CURRENT cover photo and cap quantity at the CURRENT stock.
  const [products, setProducts] = useState({}) // productId -> product
  const idsKey = [...new Set(items.map((i) => i.productId))].join(',')

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : []
    if (!ids.length) return
    let active = true
    Promise.all(
      ids.map((id) =>
        getProduct(id).then(
          (p) => [id, p],
          () => [id, null], // product gone / fetch failed
        ),
      ),
    ).then((pairs) => {
      if (active) setProducts(Object.fromEntries(pairs))
    })
    return () => {
      active = false
    }
  }, [idsKey])

  // Cover photo + available stock for a cart line, from the live product.
  const coverFor = (item) => {
    const p = products[item.productId]
    return p?.images?.[0] || p?.colors?.[0]?.images?.[0] || item.image
  }
  const stockFor = (item) => {
    const p = products[item.productId]
    if (!p) return undefined // not loaded yet — don't cap prematurely
    return p.colors
      ?.find((c) => c.name === item.color)
      ?.sizes?.find((s) => s.size === item.size)?.stock
  }

  const qualifies = subtotal >= FREE_DELIVERY_THRESHOLD
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)

  return (
    <>
      <Header solid border={false} />

      <main className="min-h-screen bg-canvas px-6 pb-24 pt-28">
        <div className="mx-auto max-w-6xl">
          {items.length === 0 ? (
            <EmptyBag />
          ) : (
            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
              {/* Items — left. Past 2 rows the grid scrolls within itself
                  (max-h ≈ 2 card rows + the gap between them). */}
              <ul className="grid flex-1 grid-cols-2 justify-items-center gap-y-9 sm:grid-cols-3 lg:max-h-[39rem] lg:overflow-y-auto lg:pr-3">
                {items.map((item) => (
                  <CartCard
                    key={item.lineId}
                    item={item}
                    cover={coverFor(item)}
                    stock={stockFor(item)}
                    onQty={(q) =>
                      dispatch(
                        updateQuantity({ lineId: item.lineId, quantity: q }),
                      )
                    }
                    onRemove={() => dispatch(removeItem(item.lineId))}
                  />
                ))}
              </ul>

              {/* Checkout — right */}
              <aside className="lg:w-[19rem] lg:shrink-0">
                <div className="border border-linen p-7 lg:sticky lg:top-28">
                  <div className="flex items-baseline justify-between">
                    <span className="eyebrow text-clay">Total</span>
                    <span className="font-display text-3xl font-light text-ink">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-right text-xs text-clay">
                    {qualifies
                      ? 'Delivery included'
                      : 'Delivery calculated at checkout'}
                  </p>

                  {qualifies ? (
                    <p className="mt-5 text-xs text-ink">
                      ✓ You've unlocked free delivery.
                    </p>
                  ) : (
                    <div className="mt-5">
                      <p className="text-xs text-clay">
                        Add {formatPrice(remaining)} more for free delivery.
                      </p>
                      <div className="mt-2 h-px w-full bg-linen">
                        <div
                          className="h-px bg-dusk transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    as={Link}
                    to="/checkout"
                    variant="solid"
                    className="mt-6 w-full"
                  >
                    Checkout
                  </Button>

                  <Link
                    to="/shop"
                    className="eyebrow mt-5 block text-center text-clay transition-colors hover:text-ink"
                  >
                    Continue shopping
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
