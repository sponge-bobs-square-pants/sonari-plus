import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { logout, selectAuthUser } from '../features/auth/authSlice'
import {
  selectCartItems,
  selectCartTotal,
  removeItem,
} from '../features/cart/cartSlice'
import Icon from '../components/ui/Icon'
import Button from '../components/ui/Button'
import Placeholder from '../components/ui/Placeholder'
import { formatPrice } from '../utils/format'

const TABS = ['Purchases', 'Favourites', 'Cart', 'My details']

/* ── Shared empty-state block ─────────────────── */
function EmptyState({ icon, title, body }) {
  return (
    <div className="flex flex-1 -translate-y-12 flex-col items-center justify-center py-12 text-center">
      <Icon name={icon} className="h-8 w-8 text-greige" />
      <h2 className="mt-5 font-display text-2xl font-light text-ink">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-clay">{body}</p>
      <Button as={Link} to="/" variant="outline" className="mt-8">
        Continue shopping
      </Button>
    </div>
  )
}

/* ── Tab panels ───────────────────────────────── */
function Purchases() {
  return (
    <EmptyState
      icon="box"
      title="No purchases yet"
      body="Once you place an order, it'll appear here — with status and history."
    />
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

function Cart() {
  const items = useSelector(selectCartItems)
  const total = useSelector(selectCartTotal)
  const dispatch = useDispatch()

  if (items.length === 0) {
    return (
      <EmptyState
        icon="bag"
        title="Your cart is empty"
        body="Pieces you add to your cart will gather here, ready for checkout."
      />
    )
  }

  return (
    <div className="max-w-xl">
      <ul className="divide-y divide-linen border-y border-linen">
        {items.map((item) => (
          <li key={item.lineId} className="flex items-center gap-4 py-4">
            <Placeholder
              src={item.image || undefined}
              tone="mid"
              mark={false}
              className="h-24 w-20 shrink-0"
            />
            <div className="flex-1">
              <h3 className="font-display text-base font-normal text-ink">
                {item.name}
              </h3>
              <p className="eyebrow mt-1 text-[0.5625rem] text-clay">
                {item.color} · {item.size}
              </p>
              <p className="mt-1 text-sm text-clay">
                {formatPrice(item.price)} · Qty {item.quantity}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(removeItem(item.lineId))}
              className="eyebrow cursor-pointer text-clay transition-colors hover:text-dusk"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="eyebrow text-clay">Total</span>
        <span className="font-display text-xl font-light text-ink">
          {formatPrice(total)}
        </span>
      </div>
      <Button variant="solid" className="mt-6 w-full">
        Checkout
      </Button>
    </div>
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
  return (
    <div className="max-w-md">
      <dl className="divide-y divide-linen border-y border-linen">
        <DetailRow label="Name" value={user?.name} />
        <DetailRow label="Email" value={user?.email} />
        <DetailRow label="Account type" value="Customer" />
      </dl>
    </div>
  )
}

const PANELS = {
  Purchases,
  Favourites,
  Cart,
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
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      {/* Sidebar — flush to the left edge, full viewport height */}
      <aside className="flex shrink-0 flex-col border-b border-linen md:w-64 md:border-b-0">
        <Link
          to="/"
          className="eyebrow group flex items-center gap-2 px-8 py-7 text-clay transition-colors hover:text-ink"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
          Back
        </Link>

        <nav className="flex flex-col gap-1 px-8 py-2 md:flex-1 md:justify-center">
          {TABS.map((t) => {
            const active = tab === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`eyebrow group flex w-full cursor-pointer items-center gap-3 py-2.5 text-left transition-colors ${
                  active ? 'text-ink' : 'text-clay hover:text-ink'
                }`}
              >
                <span
                  className={`h-px transition-all duration-300 ${
                    active ? 'w-7 bg-ink' : 'w-3 bg-greige group-hover:w-5'
                  }`}
                />
                {t}
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="eyebrow cursor-pointer border-t border-linen px-8 py-6 text-left text-clay transition-colors hover:text-ink"
        >
          Log out
        </button>
      </aside>

      {/* Content */}
      <main className="relative flex flex-1 flex-col px-8 py-14 sm:px-12 lg:px-20">
        {/* Pinned to the top-right corner, mirroring the sidebar's Back link */}
        <Link
          to="/"
          className="absolute right-8 top-7 -mr-[0.4em] font-display text-xl font-light tracking-[0.4em] text-ink"
        >
          SONARI
        </Link>

        <div>
          <p className="eyebrow text-clay">Your account</p>
          <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-ink">
            Hello, {user?.name?.split(' ')[0]}
          </h1>
        </div>
        {/* Panel fills the remaining height; empty states center
            within it, list-type panels (details, cart) sit at top. */}
        <div className="mt-12 flex flex-1 flex-col">
          <ActivePanel user={user} />
        </div>
      </main>
    </div>
  )
}
