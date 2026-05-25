import { useCallback, useEffect, useRef, useState } from 'react'
import { listBills } from '../../services/orderApi'
import { BASE_URL } from '../../services/apiClient'
import AdminPageShell from '../../components/admin/AdminPageShell'
import { formatPrice } from '../../utils/format'

const PAGE_SIZE = 40

// Local YYYY-MM-DD — the format <input type="date"> expects.
const ymd = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(
    x.getDate(),
  ).padStart(2, '0')}`
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

/* The last three calendar years, newest first — quick presets. The current
   year runs Jan 1 → today; past years run the full Jan–Dec. */
function yearPresets() {
  const now = new Date()
  const cur = now.getFullYear()
  return [cur, cur - 1, cur - 2].map((year) => ({
    year,
    from: `${year}-01-01`,
    to: year === cur ? ymd(now) : `${year}-12-31`,
  }))
}

const PRESETS = yearPresets()
const DEFAULT_RANGE = { from: PRESETS[0].from, to: PRESETS[0].to }

export default function AdminBillsPage() {
  const [range, setRange] = useState(DEFAULT_RANGE)

  const [bills, setBills] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [count, setCount] = useState(0)
  const [turnover, setTurnover] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [moreError, setMoreError] = useState(false)

  const sentinelRef = useRef(null)
  const reqIdRef = useRef(0)
  const pageRef = useRef(1)
  const loadingMoreRef = useRef(false)

  // Page 1 — on mount and whenever the date range changes.
  useEffect(() => {
    const id = ++reqIdRef.current
    pageRef.current = 1
    loadingMoreRef.current = false
    setStatus('loading')
    setError('')
    setMoreError(false)
    setBills([])

    listBills({ ...range, page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (id !== reqIdRef.current) return
        setBills(res.bills)
        setCount(res.count)
        setTurnover(res.turnover)
        setHasMore(res.hasMore)
        setStatus('ready')
      })
      .catch((err) => {
        if (id !== reqIdRef.current) return
        setError(err.message)
        setStatus('error')
      })
  }, [range])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    setMoreError(false)
    const id = reqIdRef.current
    const next = pageRef.current + 1

    listBills({ ...range, page: next, limit: PAGE_SIZE })
      .then((res) => {
        if (id !== reqIdRef.current) return
        pageRef.current = next
        setBills((prev) => [...prev, ...res.bills])
        setHasMore(res.hasMore)
      })
      .catch(() => {
        if (id === reqIdRef.current) setMoreError(true)
      })
      .finally(() => {
        if (id === reqIdRef.current) loadingMoreRef.current = false
      })
  }, [range])

  useEffect(() => {
    if (status !== 'ready' || !hasMore || moreError) return
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) loadMore()
      },
      { rootMargin: '500px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [status, hasMore, moreError, loadMore, bills.length])

  // A preset is "active" when the range matches its bounds exactly.
  const activeYear = PRESETS.find(
    (p) => p.from === range.from && p.to === range.to,
  )?.year

  return (
    <AdminPageShell backTo="/admin" backLabel="Dashboard" dark>
      <p className="eyebrow text-dusk">GST register</p>
      <h1 className="mt-2 font-display text-4xl font-light tracking-tight text-canvas">
        Bills
      </h1>

      {/* Date range — year presets + a custom from/to */}
      <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-y border-canvas/12 py-4">
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.year}
              type="button"
              onClick={() => setRange({ from: p.from, to: p.to })}
              className={`eyebrow cursor-pointer rounded-full border px-4 py-2 transition-colors ${
                activeYear === p.year
                  ? 'border-canvas bg-canvas text-ink'
                  : 'border-canvas/20 text-canvas/55 hover:border-canvas/50 hover:text-canvas'
              }`}
            >
              {p.year}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span className="eyebrow text-canvas/40">From</span>
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            style={{ colorScheme: 'dark' }}
            className="border-b border-canvas/25 bg-transparent py-1 text-sm text-canvas transition-colors focus:border-canvas/60 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="eyebrow text-canvas/40">To</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            style={{ colorScheme: 'dark' }}
            className="border-b border-canvas/25 bg-transparent py-1 text-sm text-canvas transition-colors focus:border-canvas/60 focus:outline-none"
          />
        </label>
      </div>

      {/* Summary — what the admin needs for the composition GST return */}
      <div className="mt-7 flex flex-wrap gap-x-14 gap-y-5">
        <div>
          <p className="eyebrow text-canvas/40">Bills</p>
          <p className="mt-1 font-display text-3xl font-light text-canvas">
            {count}
          </p>
        </div>
        <div>
          <p className="eyebrow text-canvas/40">Turnover</p>
          <p className="mt-1 font-display text-3xl font-light text-canvas">
            {formatPrice(turnover)}
          </p>
        </div>
        <div>
          <p className="eyebrow text-canvas/40">Composition GST · 1%</p>
          <p className="mt-1 font-display text-3xl font-light text-canvas">
            {formatPrice(turnover / 100)}
          </p>
        </div>
      </div>

      {/* The bills */}
      <div className="mt-9">
        {status === 'loading' && (
          <p className="text-sm text-canvas/55">Loading bills…</p>
        )}

        {status === 'error' && <p className="text-sm text-dusk">{error}</p>}

        {status === 'ready' && count === 0 && (
          <div className="border-y border-canvas/15 py-16 text-center">
            <p className="font-display text-xl font-light text-canvas">
              No bills in this range
            </p>
            <p className="mt-2 text-sm text-canvas/55">
              Bills of Supply appear here once orders are accepted.
            </p>
          </div>
        )}

        {status === 'ready' && count > 0 && (
          <ul className="divide-y divide-canvas/12 border-y border-canvas/12">
            {bills.map((b) => (
              <li key={b._id} className="flex items-center gap-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm text-canvas">
                    {b.billOfSupply.number}
                  </p>
                  <p className="eyebrow mt-1 text-[0.5625rem] text-canvas/45">
                    {formatDate(b.billOfSupply.issuedAt)}
                  </p>
                </div>
                <div className="hidden w-44 truncate text-sm text-canvas/70 sm:block">
                  {b.user?.name || b.shippingAddress?.fullName || 'Unknown'}
                </div>
                <div className="w-24 text-right text-sm text-canvas">
                  {formatPrice(b.total)}
                </div>
                <a
                  href={`${BASE_URL}/orders/${b._id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eyebrow shrink-0 text-canvas/55 transition-colors hover:text-canvas"
                >
                  PDF
                </a>
              </li>
            ))}
          </ul>
        )}

        {status === 'ready' && hasMore && (
          <div ref={sentinelRef} className="flex justify-center pt-8">
            {moreError ? (
              <button
                type="button"
                onClick={loadMore}
                className="eyebrow cursor-pointer text-dusk transition-colors hover:text-canvas"
              >
                Couldn’t load more — retry
              </button>
            ) : (
              <span className="eyebrow text-canvas/45">Loading more…</span>
            )}
          </div>
        )}
      </div>
    </AdminPageShell>
  )
}
