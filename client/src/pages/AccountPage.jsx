import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  logout,
  selectAuthUser,
  setAddresses,
} from '../features/auth/authSlice'
import { listOrders } from '../services/orderApi'
import { deleteAddress } from '../services/userApi'
import Header from '../components/layout/Header'
import Icon from '../components/ui/Icon'
import Button from '../components/ui/Button'
import Placeholder from '../components/ui/Placeholder'
import { formatPrice } from '../utils/format'

// The bag has its own page (/cart) — the account area no longer tabs it.
const TABS = ['Purchases', 'Favourites', 'My details']

/* ── Shared empty-state block ─────────────────── */
function EmptyState({ icon, title, body }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Icon name={icon} className="h-8 w-8 text-greige" />
      <h2 className="mt-5 font-display text-2xl font-light text-ink">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-clay">{body}</p>
      <Button as={Link} to="/shop" variant="outline" className="mt-8">
        Continue shopping
      </Button>
    </div>
  )
}

/* Ordered-on date — current-year orders show just day + month ("30 Jan");
   older orders keep the year ("30 Jan 2024"). The year key is only spread
   in when it's needed. Rendered uppercase by the heading's CSS. */
function formatOrderDate(iso) {
  const date = new Date(iso)
  const thisYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(thisYear ? {} : { year: 'numeric' }),
  })
}

// Order.status is lowercase in the DB — title-case it for display.
const STATUS_LABEL = {
  placed: 'Placed',
  accepted: 'Accepted',
  manifested: 'Preparing to ship',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  'failed-delivery': 'Failed delivery',
}

/* One product image inside an order — shown at its natural aspect ratio
   (Sonari never crops product photos). Clicking it opens the order's
   detail modal. Falls back to a tonal placeholder if the snapshot's
   image URL has since gone. */
function OrderThumb({ item, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View order details — ${item.name}`}
      className="block w-full cursor-pointer transition-opacity hover:opacity-75"
    >
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className="w-full bg-linen"
        />
      ) : (
        <Placeholder tone="mid" mark={false} className="aspect-[3/4] w-full" />
      )}
    </button>
  )
}

// Fixed thumbnail width — used for the image grid in BOTH states and for
// placing the side panel. It MUST be fixed (not fluid): if the thumbnails
// resized between collapsed and expanded, the images' height would change
// and the layout would shift. 3 × 11 + 2rem gaps = 35rem, which fits inside
// a collapsed card (max-w-xl = 36rem).
const THUMB_REM = 11

/* An order's product images — fixed THUMB_REM-wide thumbnails in BOTH
   states, so toggling the panel never resizes them (which would nudge the
   layout). Collapsed lays out 3 columns (a lone piece sits in the first);
   `sideBySide` uses only as many columns as the order has, so the detail
   panel's left edge can line up just past them. */
function OrderImages({ items, sideBySide, onThumbClick }) {
  const cols = Math.min(items.length, 3)
  return (
    <div
      className="grid items-start gap-4"
      style={{
        width: 'fit-content',
        gridTemplateColumns: `repeat(${sideBySide ? cols : 3}, ${THUMB_REM}rem)`,
      }}
    >
      {items.map((item, i) => (
        <OrderThumb
          key={`${item.productId}-${item.color}-${item.size}-${i}`}
          item={item}
          onClick={onThumbClick}
        />
      ))}
    </div>
  )
}

/* Full date for the detail panel — always carries the year, unlike the
   card heading which drops it for the current year. */
function formatFullDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/* ── Order-tracking timeline ───────────────────────
   The order's lifecycle drawn as a vertical run of bubbles. Driven by the
   order's own `status` for now (no courier call yet) — later the
   "On its way → Delivered" leg gains live Delhivery scans. Earlier steps
   read as done (filled), the current step is ringed, later steps are hollow;
   `failed-delivery` flips the last bubble to an error state and `cancelled`
   shows a short notice instead of the run. */
const TRACK_STEPS = [
  { key: 'placed', label: 'Order placed', body: 'We’ve received your order.' },
  {
    key: 'accepted',
    label: 'Confirmed',
    body: 'Payment confirmed — preparing your order.',
  },
  {
    key: 'manifested',
    label: 'Preparing to ship',
    body: 'Packed and handed to the courier soon.',
  },
  {
    key: 'dispatched',
    label: 'On its way',
    body: 'Picked up by the courier, heading to you.',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    body: 'Delivered to your address.',
  },
]
const STEP_ORDER = TRACK_STEPS.map((s) => s.key)

/* Which sprite rides the leg LEAVING step i — shown only while the order is
   parked AT that step (i === currentIndex). Each value is a CSS sprite class
   in index.css; segments without one just keep their plain line.
     0  Placed → Confirmed      — hourglass (waiting to be confirmed)
     1  Confirmed → Preparing    — delivery man on the move
     2  Preparing → On its way   — loading a trolley
     3  On its way → Delivered   — delivery truck rolling */
const SEGMENT_SPRITE = ['hourglass', 'walker', 'trolley', 'truck']

/* A frame-by-frame sprite (see the sprite classes in index.css), absolutely
   centred on its timeline connector. */
function SegmentSprite({ cls }) {
  return (
    <span
      className={`${cls} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}
      aria-hidden="true"
    />
  )
}

function TrackingTimeline({ order, compact = false }) {
  if (order.status === 'cancelled') {
    return (
      <div className="mt-5 rounded-xl bg-linen/60 p-4 text-center">
        <p className="font-display text-base font-light text-ink">
          Order cancelled
        </p>
        <p className="mt-1 text-xs leading-relaxed text-clay">
          This order was cancelled. Any payment is refunded.
        </p>
      </div>
    )
  }

  const failed = order.status === 'failed-delivery'
  // How far along the happy path we are. A failed delivery sits at the
  // 'dispatched' step, with the final bubble shown as an error.
  const currentIndex = failed
    ? STEP_ORDER.indexOf('dispatched')
    : STEP_ORDER.indexOf(order.status)

  // The gap below each step — wider when the body blurb is shown, tighter
  // in the slim-bar (compact) layout that drops it.
  const rowGap = compact ? 'pb-5' : 'pb-7'

  return (
    <ol className={compact ? 'mt-5' : 'mt-6'}>
      {TRACK_STEPS.map((step, i) => {
        const isLast = i === TRACK_STEPS.length - 1
        const done = i < currentIndex
        const current = i === currentIndex
        const reached = done || current
        const error = failed && isLast // the final bubble, on a failed delivery
        // A segment shows its sprite only while it's the active leg (the
        // order is parked at this step). When a sprite is on, the line is
        // dropped so it's just the animation.
        const spriteCls = SEGMENT_SPRITE[i]
        const hasSprite = !!spriteCls && i === currentIndex

        return (
          <li key={step.key} className={`flex ${compact ? 'gap-3' : 'gap-4'}`}>
            {/* Bubble + the hairline dropping to the next step (the "bar") */}
            <div className="flex flex-col items-center">
              <span
                className={[
                  'mt-0.5 h-3 w-3 shrink-0 rounded-full transition-colors',
                  error
                    ? 'bg-dusk'
                    : done
                      ? 'bg-ink'
                      : current
                        ? 'bg-ink ring-4 ring-ink/12'
                        : 'border border-greige bg-canvas',
                ].join(' ')}
              />
              {!isLast && (
                <span
                  className={`relative my-1 w-px flex-1 ${
                    hasSprite
                      ? 'min-h-[2.4rem]' // give the active sprite room to breathe
                      : done
                        ? 'bg-ink/40'
                        : 'bg-linen'
                  }`}
                >
                  {/* The active leg's sprite replaces the line */}
                  {hasSprite && <SegmentSprite cls={spriteCls} />}
                </span>
              )}
            </div>

            {/* Step label (+ blurb when not compact) */}
            <div className={isLast ? '' : rowGap}>
              <p
                className={`text-sm leading-snug ${
                  error ? 'text-dusk' : reached ? 'text-ink' : 'text-greige'
                }`}
              >
                {error ? 'Delivery failed' : step.label}
              </p>
              {!compact && (
                <p
                  className={`mt-0.5 text-xs leading-relaxed ${
                    reached ? 'text-clay' : 'text-greige'
                  }`}
                >
                  {error
                    ? 'The courier couldn’t deliver — we’ll be in touch.'
                    : step.body}
                </p>
              )}
              {i === 0 && (
                <p className="mt-1 text-xs text-clay">
                  {formatFullDate(order.createdAt)}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// Side-by-side column widths (rem) used when the screen is wide enough to
// place the panels beside the images. The tracking timeline is a SLIM
// vertical bar (not a card) to the right of the summary card, so the row
// stays inside the page width.
const CARD_REM = 25
const TRACK_REM = 11
const COL_GAP_REM = 1.75

/* ── Order detail panel ───────────────────────────
   Expands when one of an order's products is clicked — part of the page,
   not a popup. When `sideBySide` (a wide screen) the summary card is
   ABSOLUTELY positioned beside the images, pinned at the TOP only — so
   opening it never shifts the orders below. The tracking timeline, when
   open, is a SECOND panel positioned just to the right of that card (outside
   it). On a narrow screen both stack below the images instead. */
function OrderDetailPanel({ order, cols, sideBySide, tracking, onTrack, onClose }) {
  const orderNo = order._id.slice(-8).toUpperCase()
  // Absolute layout: the card's left edge sits just past the image grid —
  // cols × THUMB_REM thumbnails + (cols−1) × 1rem gaps + a 2rem gutter.
  const leftRem = cols * THUMB_REM + (cols - 1) + 2

  const chrome =
    'animate-fade-up rounded-[1.25rem] bg-oat p-6 shadow-[0_24px_56px_-34px_rgba(46,42,38,0.4)] ring-1 ring-linen'

  const cardStyle = sideBySide
    ? { position: 'absolute', top: 0, left: `${leftRem}rem`, width: `${CARD_REM}rem` }
    : { marginTop: '1.75rem', maxWidth: '25rem' }

  const trackStyle = sideBySide
    ? {
        position: 'absolute',
        top: 0,
        left: `${leftRem + CARD_REM + COL_GAP_REM}rem`,
        width: `${TRACK_REM}rem`,
      }
    : { marginTop: '1.25rem', maxWidth: '25rem' }

  return (
    <>
      {/* Summary card */}
      <div className={chrome} style={cardStyle}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-clay">Order</p>
            <p className="mt-1.5 font-display text-2xl font-light tracking-tight text-ink">
              #{orderNo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="-mr-1 -mt-1 shrink-0 cursor-pointer rounded-full p-2 text-clay transition-colors hover:bg-linen hover:text-ink"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {/* Dates — two quiet columns, set apart by whitespace, not rules */}
        <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-1.5">
          <dt className="eyebrow text-clay">Placed</dt>
          <dt className="eyebrow text-clay">Return by</dt>
          <dd className="text-sm text-ink">{formatFullDate(order.createdAt)}</dd>
          <dd className="text-sm text-ink">
            {order.returnDeadline ? formatFullDate(order.returnDeadline) : '—'}
          </dd>
        </dl>

        {/* Actions — Invoice + Track (Track opens the timeline panel) */}
        <div className="mt-7 flex gap-3">
          {order.billOfSupply?.url ? (
            <Button
              as="a"
              href={order.billOfSupply.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              className="flex-1"
            >
              Invoice
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" disabled>
              Invoice
            </Button>
          )}
          <Button
            variant={tracking ? 'outline' : 'solid'}
            className="flex-1"
            onClick={() => onTrack(!tracking)}
          >
            {tracking ? 'Hide' : 'Track'}
          </Button>
        </div>
      </div>

      {/* Tracking timeline — a slim vertical bar to the RIGHT of the card
          (no card chrome, so it fits the gutter). On a narrow screen it
          stacks below the card, set off by a hairline. */}
      {tracking && (
        <div
          style={trackStyle}
          className={sideBySide ? undefined : 'border-t border-linen pt-5'}
        >
          <p className="eyebrow text-clay">Tracking</p>
          <TrackingTimeline order={order} compact />
        </div>
      )}
    </>
  )
}

/* ── Tab panels ───────────────────────────────── */
function Purchases() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [expandedId, setExpandedId] = useState(null) // order with its panel open
  const [tracking, setTracking] = useState(false) // tracking panel open for it?
  // The detail panel sits beside the images only when the screen is wide
  // enough (≥1024px); below that it stacks underneath instead.
  const [wide, setWide] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches,
  )

  useEffect(() => {
    // listOrders() resolves newest-first — the server sorts by createdAt desc.
    listOrders()
      .then((list) => {
        setOrders(list)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setWide(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  if (status === 'loading') {
    return <p className="text-sm text-clay">Loading your orders…</p>
  }
  if (status === 'error') {
    return <p className="text-sm text-dusk">Could not load your orders.</p>
  }
  if (orders.length === 0) {
    return (
      <EmptyState
        icon="box"
        title="No purchases yet"
        body="Once you place an order, it'll appear here — with status and history."
      />
    )
  }

  // Clicking a product toggles its order's detail panel. Switching orders (or
  // closing) always collapses the tracking panel back down.
  const toggle = (id) => {
    setTracking(false)
    setExpandedId((cur) => (cur === id ? null : id))
  }
  const close = () => {
    setTracking(false)
    setExpandedId(null)
  }

  return (
    <ul className="space-y-14">
      {orders.map((order) => {
        const expanded = expandedId === order._id
        // Side-by-side layout only when expanded AND there's room for it.
        const sideBySide = expanded && wide
        return (
          <li
            key={order._id}
            className={sideBySide ? undefined : 'max-w-xl'}
          >
            {/* When it was ordered — the visual anchor of the card */}
            <h3 className="font-display text-4xl font-light uppercase text-ink">
              {formatOrderDate(order.createdAt)}
            </h3>

            {/* Status · total — one quiet line beneath the date */}
            <p className="eyebrow mt-2.5 text-clay">
              {STATUS_LABEL[order.status] || order.status}
              {' · '}
              {formatPrice(order.total)}
            </p>

            {/* Images, and — when expanded — the detail panels. Side-by-side,
                they're absolutely positioned (position: relative here anchors
                them), so opening either one never grows the card or shifts the
                orders below. The tracking panel sits out in the right gutter,
                past where lower orders have any content, so even when it's
                taller than the images it overlaps nothing. Narrow screens
                stack everything. Click toggles it. */}
            <div
              className="mt-7"
              style={sideBySide ? { position: 'relative' } : undefined}
            >
              <OrderImages
                items={order.items}
                sideBySide={sideBySide}
                onThumbClick={() => toggle(order._id)}
              />
              {expanded && (
                <OrderDetailPanel
                  order={order}
                  cols={Math.min(order.items.length, 3)}
                  sideBySide={sideBySide}
                  tracking={tracking}
                  onTrack={setTracking}
                  onClose={close}
                />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Favourites() {
  return (
    <EmptyState
      icon="heart"
      title="No favourites yet"
      body="Tap the heart on any piece to save it here for later."
    />
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-4">
      <dt className="eyebrow text-clay">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  )
}

function MyDetails({ user }) {
  const dispatch = useDispatch()
  const addresses = user?.addresses ?? []

  const handleRemove = async (id) => {
    try {
      const updated = await deleteAddress(id)
      dispatch(setAddresses(updated))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="max-w-md">
      <dl className="divide-y divide-linen border-y border-linen">
        <DetailRow label="Name" value={user?.name} />
        <DetailRow label="Email" value={user?.email} />
        <DetailRow label="Account type" value="Customer" />
      </dl>

      <div className="mt-10">
        <p className="eyebrow text-clay">Saved addresses</p>
        {addresses.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-clay">
            No saved addresses yet. Tick &ldquo;Save this address&rdquo; at
            checkout to keep one here.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {addresses.map((addr) => (
              <li
                key={addr._id}
                className="flex items-start justify-between gap-4 border border-linen p-4"
              >
                <div>
                  <p className="text-sm text-ink">{addr.fullName}</p>
                  <p className="mt-1 text-xs leading-relaxed text-clay">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ''}
                    <br />
                    {addr.city}, {addr.state} {addr.pincode}
                    <br />
                    {addr.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(addr._id)}
                  className="eyebrow shrink-0 cursor-pointer text-clay transition-colors hover:text-dusk"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const PANELS = {
  Purchases,
  Favourites,
  'My details': MyDetails,
}

/* ── Page ─────────────────────────────────────── */
export default function AccountPage() {
  const user = useSelector(selectAuthUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Purchases')

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/')
  }

  const ActivePanel = PANELS[tab]

  // Admins have no customer account — send them straight to the dashboard.
  if (user?.role === 'admin') return <Navigate to="/admin" replace />

  return (
    <>
      <Header solid border={false} />

      <main className="min-h-screen bg-canvas px-6 pb-24 pt-28">
        <div className="mx-auto max-w-5xl">
          {/* Tabs — log out aligned to the right of the same line */}
          <div className="flex items-end justify-between gap-6 border-b border-linen">
            <nav className="flex gap-8">
              {TABS.map((t) => {
                const active = tab === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`eyebrow relative -mb-px cursor-pointer pb-4 transition-colors ${
                      active ? 'text-ink' : 'text-clay hover:text-ink'
                    }`}
                  >
                    {t}
                    {active && (
                      <span className="absolute inset-x-0 bottom-0 h-px bg-ink" />
                    )}
                  </button>
                )
              })}
            </nav>
            <button
              type="button"
              onClick={handleLogout}
              className="eyebrow shrink-0 cursor-pointer pb-4 text-clay transition-colors hover:text-dusk"
            >
              Log out
            </button>
          </div>

          {/* Active panel */}
          <div className="mt-10">
            <ActivePanel user={user} />
          </div>
        </div>
      </main>
    </>
  )
}
