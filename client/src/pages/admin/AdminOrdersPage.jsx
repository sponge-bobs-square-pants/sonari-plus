import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listAllOrders,
  markOrderSeen,
  verifyOrder,
  generateBill,
  manifestOrder,
  getOrderLabel,
  markDelivered,
  markDeliveryFailed,
} from '../../services/orderApi'
import AdminPageShell from '../../components/admin/AdminPageShell'
import Icon from '../../components/ui/Icon'
import { formatPrice } from '../../utils/format'

// The orders API is paginated; the list pulls a generous page and offers
// "Load more" at the foot of the scrollable column.
const ADMIN_PAGE_SIZE = 30
const SEARCH_DEBOUNCE = 350 // ms — wait for typing to settle before fetching

const EMPTY_FILTERS = {
  paymentStatus: '',
  status: '',
  unseen: false,
  dateFrom: '',
  dateTo: '',
}

const PAYMENT_LABEL = { created: 'Pending', paid: 'Paid', failed: 'Failed' }
const STATUS_LABEL = {
  placed: 'Placed',
  accepted: 'Accepted',
  manifested: 'Ready for pickup',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  'failed-delivery': 'Failed delivery',
}
const VERIFY_LABEL = { paid: 'Paid', failed: 'Failed', pending: 'Pending' }
// Our recorded paymentStatus mapped onto the verify check's vocabulary,
// so the two can be compared for a match.
const OUR_TO_VERIFY = { created: 'pending', paid: 'paid', failed: 'failed' }

const orderNoOf = (order) => order._id.slice(-8).toUpperCase()
const customerOf = (order) =>
  order.user?.name || order.shippingAddress?.fullName || 'Unknown'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/* Payment chip — `paid` reads solid, `failed` flags in dusk, `pending`
   stays muted. Used in the detail header. */
function PaymentChip({ status }) {
  const tone =
    status === 'paid'
      ? 'border-canvas text-canvas'
      : status === 'failed'
        ? 'border-dusk text-dusk'
        : 'border-canvas/25 text-canvas/45'
  return (
    <span className={`eyebrow rounded-full border px-3 py-1 ${tone}`}>
      {PAYMENT_LABEL[status] || status}
    </span>
  )
}

/* Tiny payment indicator for the dense list rows. */
function PaymentDot({ status }) {
  const tone =
    status === 'paid'
      ? 'bg-canvas'
      : status === 'failed'
        ? 'bg-dusk'
        : 'bg-canvas/30'
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
}

/* ── Filter bar ──────────────────────────────────── */
function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2">
      <span className="eyebrow text-canvas/40">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="cursor-pointer border-b border-canvas/25 bg-transparent py-1 text-sm text-canvas transition-colors focus:border-canvas/60 focus:outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-ink text-canvas">
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

function FilterDate({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <span className="eyebrow text-canvas/40">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="border-b border-canvas/25 bg-transparent py-1 text-sm text-canvas transition-colors focus:border-canvas/60 focus:outline-none"
      />
    </label>
  )
}

function FilterBar({ filters, onChange, search, onSearchChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })
  const active =
    filters.paymentStatus ||
    filters.status ||
    filters.unseen ||
    filters.dateFrom ||
    filters.dateTo

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-7 gap-y-3 border-y border-canvas/12 py-3.5">
      {/* Search by order ID — the short code a customer would quote */}
      <div className="flex items-center gap-2 border-b border-canvas/25 py-1 transition-colors focus-within:border-canvas/60">
        <Icon name="search" className="h-4 w-4 shrink-0 text-canvas/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search order ID"
          aria-label="Search by order ID"
          className="w-40 bg-transparent text-sm text-canvas placeholder:text-canvas/35 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="shrink-0 cursor-pointer text-canvas/40 transition-colors hover:text-canvas"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => set({ unseen: !filters.unseen })}
        className={`eyebrow cursor-pointer rounded-full border px-3.5 py-1.5 transition-colors ${
          filters.unseen
            ? 'border-canvas bg-canvas text-ink'
            : 'border-canvas/25 text-canvas/55 hover:border-canvas/50 hover:text-canvas'
        }`}
      >
        New only
      </button>
      <FilterSelect
        label="Payment"
        value={filters.paymentStatus}
        onChange={(v) => set({ paymentStatus: v })}
        options={[
          ['', 'All'],
          ['paid', 'Paid'],
          ['created', 'Pending'],
          ['failed', 'Failed'],
        ]}
      />
      <FilterSelect
        label="Status"
        value={filters.status}
        onChange={(v) => set({ status: v })}
        options={[
          ['', 'All'],
          ['placed', 'Placed'],
          ['accepted', 'Accepted'],
          ['manifested', 'Ready for pickup'],
          ['dispatched', 'Dispatched'],
          ['delivered', 'Delivered'],
          ['failed-delivery', 'Failed delivery'],
          ['cancelled', 'Cancelled'],
        ]}
      />
      <FilterDate
        label="From"
        value={filters.dateFrom}
        onChange={(v) => set({ dateFrom: v })}
      />
      <FilterDate
        label="To"
        value={filters.dateTo}
        onChange={(v) => set({ dateTo: v })}
      />
      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="eyebrow cursor-pointer text-canvas/45 transition-colors hover:text-dusk"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

/* ── One row in the left-hand list ──────────────── */
function OrderListRow({ order, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full cursor-pointer border-l-2 px-4 py-3.5 text-left transition-colors ${
        selected
          ? 'border-canvas bg-canvas/8'
          : 'border-transparent hover:bg-canvas/5'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-sm text-canvas">
            #{orderNoOf(order)}
          </span>
          {!order.seenByAdmin && (
            <span className="rounded-full bg-dusk px-1.5 py-0.5 text-[0.5rem] font-medium uppercase tracking-wider text-canvas">
              New
            </span>
          )}
        </span>
        <span className="text-sm text-canvas/70">
          {formatPrice(order.total)}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-canvas/45">
        {customerOf(order)} · {formatDate(order.createdAt)}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <PaymentDot status={order.paymentStatus} />
        <span className="eyebrow text-[0.5625rem] text-canvas/45">
          {PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus} ·{' '}
          {STATUS_LABEL[order.status] || order.status}
        </span>
      </div>
    </button>
  )
}

/* ── Razorpay verify panel — sits beside the status pills ── */
function VerifyPanel({ order, verifying, error, onRecheck }) {
  const v = order.verification
  const ourStatus = OUR_TO_VERIFY[order.paymentStatus]
  const matches = v ? v.status === ourStatus : null

  return (
    <div className="min-w-[12rem]">
      <div className="flex items-center gap-3">
        {verifying ? (
          <span className="text-sm text-canvas/55">Checking…</span>
        ) : v ? (
          <span
            className={`eyebrow rounded-full border px-3 py-1 ${
              matches ? 'border-canvas text-canvas' : 'border-dusk text-dusk'
            }`}
          >
            {VERIFY_LABEL[v.status] || v.status}
          </span>
        ) : (
          <span className="text-sm text-canvas/40">—</span>
        )}
        <button
          type="button"
          onClick={onRecheck}
          disabled={verifying}
          className="eyebrow cursor-pointer text-canvas/55 transition-colors hover:text-canvas disabled:cursor-not-allowed disabled:opacity-40"
        >
          Re-check
        </button>
      </div>
      <p className="eyebrow mt-2 text-canvas/40">Razorpay check</p>
      {error ? (
        <p className="mt-1.5 text-xs text-dusk">{error}</p>
      ) : v && !verifying && !matches ? (
        <p className="mt-1.5 text-xs text-dusk">
          ⚠ Does not match our record — investigate
        </p>
      ) : null}
    </div>
  )
}

/* ── Fulfilment — Delhivery shipping + delivery outcome ── */
/**
 * The fulfilment block — shows the control that fits the order's current
 * status: the "Ship with Delhivery" form when `accepted`, a ready-for-pickup
 * note when `manifested`, deliver / failed-delivery buttons when
 * `dispatched`, a read-only outcome thereafter. Keyed by order id so the
 * manifest form's inputs reset between orders.
 */
function FulfilmentSection({
  order,
  busy,
  error,
  onManifest,
  onLabel,
  onDeliver,
  onFailDelivery,
}) {
  // Physical package details Delhivery can't infer (for the manifest).
  const [weight, setWeight] = useState('')
  const [dims, setDims] = useState({ l: '', w: '', h: '' })

  const shipment = order.courier && (
    <p className="mt-2 text-sm text-canvas/80">
      Delhivery ·{' '}
      <span className="text-canvas">{order.trackingId}</span>
      {order.pickupId ? (
        <span className="text-canvas/45"> · pickup #{order.pickupId}</span>
      ) : null}
    </p>
  )

  const labelButton = order.trackingId && (
    <button
      type="button"
      onClick={onLabel}
      className="eyebrow cursor-pointer rounded-full border border-canvas/30 px-5 py-2.5 text-canvas/70 transition-colors hover:border-canvas hover:text-canvas"
    >
      Print label
    </button>
  )

  return (
    <div className="mt-8 border-t border-canvas/10 pt-6">
      <p className="eyebrow text-canvas/40">Fulfilment</p>

      {order.status === 'placed' && (
        <p className="mt-2 text-xs text-canvas/45">
          Generate the Bill of Supply first — an order is dispatched once it
          has been accepted.
        </p>
      )}

      {order.status === 'accepted' && (
        <div className="mt-3">
          {/* Delhivery: manifest the parcel, then schedule pickup via the API */}
          <div>
            <p className="eyebrow mb-3 text-canvas/55">Ship with Delhivery</p>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow text-canvas/40">Weight (g)</span>
                <input
                  type="number"
                  min="1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="400"
                  className="w-24 border-b border-canvas/25 bg-transparent py-1 text-sm text-canvas placeholder:text-canvas/35 transition-colors focus:border-canvas/60 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow text-canvas/40">L × W × H (cm)</span>
                <div className="flex items-center gap-1.5">
                  {['l', 'w', 'h'].map((k) => (
                    <span key={k} className="flex items-center gap-1.5">
                      {k !== 'l' && <span className="text-canvas/30">×</span>}
                      <input
                        type="number"
                        min="1"
                        value={dims[k]}
                        onChange={(e) =>
                          setDims((d) => ({ ...d, [k]: e.target.value }))
                        }
                        placeholder={k.toUpperCase()}
                        className="w-12 border-b border-canvas/25 bg-transparent py-1 text-center text-sm text-canvas placeholder:text-canvas/35 transition-colors focus:border-canvas/60 focus:outline-none"
                      />
                    </span>
                  ))}
                </div>
              </label>
              <button
                type="button"
                onClick={() =>
                  onManifest({
                    weight,
                    length: dims.l,
                    width: dims.w,
                    height: dims.h,
                  })
                }
                disabled={busy || !weight}
                className="eyebrow cursor-pointer rounded-full border border-canvas px-5 py-2.5 text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? 'Creating…' : 'Mark ready for pickup'}
              </button>
            </div>
            <p className="mt-2 text-xs text-canvas/40">
              Creates the waybill + label. Schedule the courier pickup later
              from the Pickups panel.
            </p>
          </div>
        </div>
      )}

      {order.status === 'manifested' && (
        <div className="mt-2.5">
          {shipment}
          <p className="mt-2 text-xs text-canvas/45">
            Ready for pickup — schedule the courier in the Pickups panel.
          </p>
          {labelButton && <div className="mt-4">{labelButton}</div>}
        </div>
      )}

      {order.status === 'dispatched' && (
        <div className="mt-2.5">
          {shipment}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onDeliver}
              disabled={busy}
              className="eyebrow cursor-pointer rounded-full border border-canvas px-5 py-2.5 text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Mark delivered'}
            </button>
            <button
              type="button"
              onClick={onFailDelivery}
              disabled={busy}
              className="eyebrow cursor-pointer rounded-full border border-canvas/30 px-5 py-2.5 text-canvas/70 transition-colors hover:border-dusk hover:text-dusk disabled:cursor-not-allowed disabled:opacity-40"
            >
              Failed delivery
            </button>
            {labelButton}
          </div>
        </div>
      )}

      {order.status === 'delivered' && (
        <div className="mt-2.5">
          {shipment}
          <p className="mt-3 text-sm text-canvas/80">
            Delivered
            {order.returnDeadline && (
              <span className="text-canvas/45">
                {' '}
                · return window until {formatDate(order.returnDeadline)}
              </span>
            )}
          </p>
          {labelButton && <div className="mt-4">{labelButton}</div>}
        </div>
      )}

      {order.status === 'failed-delivery' && (
        <div className="mt-2.5">
          {shipment}
          <p className="mt-3 text-sm text-dusk">
            Delivery failed — the courier could not deliver this parcel.
          </p>
          {labelButton && <div className="mt-4">{labelButton}</div>}
        </div>
      )}

      {order.status === 'cancelled' && (
        <p className="mt-2 text-xs text-canvas/45">This order was cancelled.</p>
      )}

      {error && <p className="mt-3 text-xs text-dusk">{error}</p>}
    </div>
  )
}

/* ── Right-hand detail of the selected order ─────── */
function OrderDetail({
  order,
  verifying,
  verifyError,
  onRecheck,
  billBusy,
  billError,
  onGenerateBill,
  fulfilBusy,
  fulfilError,
  onManifest,
  onLabel,
  onDeliver,
  onFailDelivery,
}) {
  const addr = order.shippingAddress
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)

  return (
    <div>
      {/* Header — order number, statuses, verify panel */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="eyebrow text-dusk">Order</p>
          <h2 className="mt-1.5 font-display text-3xl font-light tracking-tight text-canvas">
            #{orderNoOf(order)}
          </h2>
          <p className="mt-2 text-xs text-canvas/45">
            Placed {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-x-9 gap-y-4">
          <div className="flex flex-col items-start gap-2">
            <PaymentChip status={order.paymentStatus} />
            <span className="eyebrow text-[0.5625rem] text-canvas/55">
              {STATUS_LABEL[order.status] || order.status}
            </span>
          </div>
          <VerifyPanel
            order={order}
            verifying={verifying}
            error={verifyError}
            onRecheck={onRecheck}
          />
        </div>
      </div>

      {/* Customer · shipping · Razorpay references */}
      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        <div>
          <p className="eyebrow text-canvas/40">Customer</p>
          <p className="mt-2 text-sm text-canvas">{customerOf(order)}</p>
          {order.user?.email && (
            <p className="mt-0.5 text-xs text-canvas/45">{order.user.email}</p>
          )}
        </div>
        <div>
          <p className="eyebrow text-canvas/40">Ship to</p>
          <p className="mt-2 text-sm leading-relaxed text-canvas/80">
            {addr.fullName}
            <br />
            {addr.line1}
            {addr.line2 ? `, ${addr.line2}` : ''}
            <br />
            {addr.city}, {addr.state} {addr.pincode}
            <br />
            {addr.phone}
          </p>
        </div>
        {/* Razorpay IDs — for looking the order up in the Razorpay dashboard */}
        <div>
          <p className="eyebrow text-canvas/40">Razorpay order ID</p>
          <p className="mt-2 break-all text-sm text-canvas/85">
            {order.razorpayOrderId || '—'}
          </p>
          <p className="eyebrow mt-4 text-canvas/40">Razorpay payment ID</p>
          <p className="mt-2 break-all text-sm text-canvas/85">
            {order.razorpayPaymentId || '—'}
          </p>
        </div>
      </div>

      {/* Items */}
      <p className="eyebrow mt-8 text-canvas/40">
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </p>
      <ul className="mt-3 divide-y divide-canvas/10 border-y border-canvas/10">
        {order.items.map((item, i) => (
          <li
            key={`${item.productId}-${item.color}-${item.size}-${i}`}
            className="flex items-center gap-4 py-3"
          >
            <div className="h-16 w-12 shrink-0 overflow-hidden bg-canvas/5">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover object-top"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-canvas">{item.name}</p>
              <p className="mt-0.5 text-xs text-canvas/45">
                {[item.color, item.size].filter(Boolean).join(' · ')}
              </p>
            </div>
            <p className="shrink-0 text-xs text-canvas/45">
              {item.quantity} × {formatPrice(item.price)}
            </p>
            <p className="w-20 shrink-0 text-right text-sm text-canvas">
              {formatPrice(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      {/* Totals */}
      <dl className="mt-5 ml-auto max-w-[16rem] space-y-2">
        <div className="flex justify-between text-sm">
          <dt className="text-canvas/55">Subtotal</dt>
          <dd className="text-canvas/80">{formatPrice(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-canvas/55">Delivery</dt>
          <dd className="text-canvas/80">
            {order.deliveryFee === 0 ? 'Free' : formatPrice(order.deliveryFee)}
          </dd>
        </div>
        <div className="mt-2 flex justify-between border-t border-canvas/15 pt-2.5">
          <dt className="eyebrow text-canvas">Total</dt>
          <dd className="font-display text-base text-canvas">
            {formatPrice(order.total)}
          </dd>
        </div>
      </dl>

      {/* Bill of Supply */}
      <div className="mt-8 border-t border-canvas/10 pt-6">
        <p className="eyebrow text-canvas/40">Bill of Supply</p>
        {order.billOfSupply?.url ? (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm text-canvas">
                {order.billOfSupply.number}
              </p>
              <p className="mt-0.5 text-xs text-canvas/45">
                Issued {formatDateTime(order.billOfSupply.issuedAt)}
              </p>
            </div>
            <a
              href={order.billOfSupply.url}
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow rounded-full border border-canvas/30 px-4 py-2 text-canvas/70 transition-colors hover:border-canvas hover:text-canvas"
            >
              View PDF
            </a>
          </div>
        ) : order.paymentStatus === 'paid' ? (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={onGenerateBill}
              disabled={billBusy}
              className="eyebrow cursor-pointer rounded-full border border-canvas px-5 py-2.5 text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {billBusy ? 'Generating…' : 'Generate Bill of Supply'}
            </button>
            <p className="mt-2 text-xs text-canvas/40">
              Generating it accepts the order (status → Accepted).
            </p>
            {billError && (
              <p className="mt-1.5 text-xs text-dusk">{billError}</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-canvas/45">
            Available once the payment is confirmed paid.
          </p>
        )}
      </div>

      {/* Fulfilment — keyed by order id so the manifest form resets. */}
      <FulfilmentSection
        key={order._id}
        order={order}
        busy={fulfilBusy}
        error={fulfilError}
        onManifest={onManifest}
        onLabel={onLabel}
        onDeliver={onDeliver}
        onFailDelivery={onFailDelivery}
      />
    </div>
  )
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [moreError, setMoreError] = useState(false)
  const [selectedId, setSelectedId] = useState(null) // open order
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [search, setSearch] = useState('') // raw order-ID search input
  const [query, setQuery] = useState('') // debounced — what we fetch on
  const [verifyingId, setVerifyingId] = useState(null) // order being verified
  const [verifyError, setVerifyError] = useState('')
  const [billBusyId, setBillBusyId] = useState(null) // order generating a bill
  const [billError, setBillError] = useState('')
  const [fulfilBusyId, setFulfilBusyId] = useState(null) // order being fulfilled
  const [fulfilError, setFulfilError] = useState('')

  const sentinelRef = useRef(null)
  // reqId tags every fetch: when a filter/search changes mid-flight the id
  // moves on, so the stale response is recognised and dropped.
  const reqIdRef = useRef(0)
  const pageRef = useRef(1)
  const loadingMoreRef = useRef(false)

  // Debounce the search box — one fetch when typing settles, not per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE)
    return () => clearTimeout(t)
  }, [search])

  // Page 1 — on mount and whenever a filter or the search changes. A
  // selection is kept only if it survives the new results; else cleared.
  useEffect(() => {
    const id = ++reqIdRef.current
    pageRef.current = 1
    loadingMoreRef.current = false
    setStatus('loading')
    setError('')
    setMoreError(false)
    setOrders([])

    listAllOrders({ ...filters, search: query, page: 1, limit: ADMIN_PAGE_SIZE })
      .then((res) => {
        if (id !== reqIdRef.current) return // a newer query superseded us
        setOrders(res.orders)
        setTotal(res.total)
        setHasMore(res.hasMore)
        setSelectedId((cur) =>
          res.orders.some((o) => o._id === cur) ? cur : null,
        )
        setStatus('ready')
      })
      .catch((err) => {
        if (id !== reqIdRef.current) return
        setError(err.message)
        setStatus('error')
      })
  }, [filters, query])

  // Next page — append, don't replace.
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    setMoreError(false)
    const id = reqIdRef.current
    const next = pageRef.current + 1

    listAllOrders({
      ...filters,
      search: query,
      page: next,
      limit: ADMIN_PAGE_SIZE,
    })
      .then((res) => {
        if (id !== reqIdRef.current) return // query changed — drop the page
        pageRef.current = next
        setOrders((prev) => [...prev, ...res.orders])
        setHasMore(res.hasMore)
      })
      .catch(() => {
        if (id === reqIdRef.current) setMoreError(true)
      })
      .finally(() => {
        if (id === reqIdRef.current) loadingMoreRef.current = false
      })
  }, [filters, query])

  // Watch the sentinel at the foot of the list; fetch the next page as it
  // nears view. Rebuilt after each append (orders.length dep) so it
  // re-checks intersection and keeps tall lists filling.
  useEffect(() => {
    if (status !== 'ready' || !hasMore || moreError) return
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [status, hasMore, moreError, loadMore, orders.length])

  // Drop a freshly-updated order back into the list in place.
  const mergeOrder = (updated) =>
    setOrders((list) =>
      list.map((o) => (o._id === updated._id ? updated : o)),
    )

  // Run the Razorpay verify check and fold the result back in.
  const runVerify = async (id) => {
    setVerifyingId(id)
    setVerifyError('')
    try {
      mergeOrder(await verifyOrder(id))
    } catch (err) {
      setVerifyError(err.message || 'Could not reach Razorpay.')
    } finally {
      setVerifyingId(null)
    }
  }

  // Generate the Bill of Supply, then fold the updated order back in.
  const runGenerateBill = async (id) => {
    setBillBusyId(id)
    setBillError('')
    try {
      mergeOrder(await generateBill(id))
    } catch (err) {
      setBillError(err.message || 'Could not generate the bill.')
    } finally {
      setBillBusyId(null)
    }
  }

  // A fulfilment action (dispatch / deliver / fail-delivery) — runs the
  // given API call and folds the updated order back into the list.
  const runFulfilAction = async (id, action) => {
    setFulfilBusyId(id)
    setFulfilError('')
    try {
      mergeOrder(await action())
    } catch (err) {
      setFulfilError(err.message || 'Could not update the order.')
    } finally {
      setFulfilBusyId(null)
    }
  }

  // Manifest with Delhivery (create shipment → 'manifested', ready for pickup).
  const runManifest = (id, pkg) =>
    runFulfilAction(id, () => manifestOrder(id, pkg))

  // Fetch + open the shipping label. The tab is opened synchronously on the
  // click so the browser doesn't block the post-fetch navigation as a popup.
  const runLabel = (id) => {
    const win = window.open('', '_blank')
    setFulfilError('')
    getOrderLabel(id)
      .then((url) => {
        if (win) win.location = url
      })
      .catch((err) => {
        if (win) win.close()
        setFulfilError(err.message || 'Could not fetch the label.')
      })
  }

  // Selecting an order marks it seen, and verifies it the first time.
  const handleSelect = (order) => {
    setSelectedId(order._id)
    setVerifyError('')
    setBillError('')
    setFulfilError('')
    if (!order.seenByAdmin) {
      markOrderSeen(order._id).then(mergeOrder).catch(() => {})
    }
    if (!order.verification) runVerify(order._id)
  }

  const selected = orders.find((o) => o._id === selectedId) || null
  const filtered = filters !== EMPTY_FILTERS || query

  return (
    <AdminPageShell backTo="/admin" backLabel="Dashboard" dark full>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="mt-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {status === 'loading' && (
          <p className="text-sm text-canvas/55">Loading orders…</p>
        )}

        {status === 'error' && <p className="text-sm text-dusk">{error}</p>}

        {status === 'ready' && total === 0 && (
          <div className="border-y border-canvas/15 py-20 text-center">
            <p className="font-display text-2xl font-light text-canvas">
              No orders
            </p>
            <p className="mt-2 text-sm text-canvas/55">
              {filtered
                ? 'No orders match these filters.'
                : 'Orders placed by customers will appear here.'}
            </p>
          </div>
        )}

        {status === 'ready' && total > 0 && (
          <div className="flex flex-col gap-8 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-10">
            {/* Left — scrollable list of orders */}
            <div className="lg:flex lg:min-h-0 lg:w-[20rem] lg:shrink-0 lg:flex-col">
              <p className="eyebrow mb-3 text-[0.5625rem] text-canvas/40">
                {total} {total === 1 ? 'order' : 'orders'}
              </p>
              <ul className="divide-y divide-canvas/8 border-y border-canvas/8 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                {orders.map((o) => (
                  <li key={o._id}>
                    <OrderListRow
                      order={o}
                      selected={o._id === selectedId}
                      onClick={() => handleSelect(o)}
                    />
                  </li>
                ))}
                {hasMore && (
                  <li ref={sentinelRef} className="px-4 py-5 text-center">
                    {moreError ? (
                      <button
                        type="button"
                        onClick={loadMore}
                        className="eyebrow cursor-pointer text-dusk transition-colors hover:text-canvas"
                      >
                        Couldn’t load more — retry
                      </button>
                    ) : (
                      <span className="eyebrow text-canvas/40">
                        Loading more…
                      </span>
                    )}
                  </li>
                )}
              </ul>
            </div>

            {/* Right — the selected order's detail */}
            <div className="scrollbar-hide lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {selected ? (
                <OrderDetail
                  order={selected}
                  verifying={verifyingId === selected._id}
                  verifyError={verifyError}
                  onRecheck={() => runVerify(selected._id)}
                  billBusy={billBusyId === selected._id}
                  billError={billError}
                  onGenerateBill={() => runGenerateBill(selected._id)}
                  fulfilBusy={fulfilBusyId === selected._id}
                  fulfilError={fulfilError}
                  onManifest={(pkg) => runManifest(selected._id, pkg)}
                  onLabel={() => runLabel(selected._id)}
                  onDeliver={() =>
                    runFulfilAction(selected._id, () =>
                      markDelivered(selected._id),
                    )
                  }
                  onFailDelivery={() =>
                    runFulfilAction(selected._id, () =>
                      markDeliveryFailed(selected._id),
                    )
                  }
                />
              ) : (
                <div className="flex items-center justify-center py-20">
                  <p className="text-sm text-canvas/40">
                    Select an order to see its details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminPageShell>
  )
}
