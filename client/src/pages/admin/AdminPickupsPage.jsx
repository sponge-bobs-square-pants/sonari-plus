import { useEffect, useState } from 'react'
import {
  listManifested,
  createBatchPickup,
  getOrderLabel,
} from '../../services/orderApi'
import AdminPageShell from '../../components/admin/AdminPageShell'

const todayStr = () => new Date().toISOString().slice(0, 10)
const orderNoOf = (o) => o._id.slice(-8).toUpperCase()
const customerOf = (o) =>
  o.user?.name || o.shippingAddress?.fullName || 'Unknown'
const itemCountOf = (o) => o.items.reduce((n, i) => n + i.quantity, 0)

/**
 * The Pickups panel — every manifested order awaiting a courier. The admin
 * ticks the parcels going out, picks a slot, and books ONE Delhivery pickup
 * that collects them all (count = number selected). Booked orders leave the
 * list (they become 'dispatched').
 */
export default function AdminPickupsPage() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [pickupDate, setPickupDate] = useState(todayStr())
  const [pickupTime, setPickupTime] = useState('14:00')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    listManifested()
      .then((os) => {
        setOrders(os)
        setStatus('ready')
      })
      .catch((e) => {
        setError(e.message)
        setStatus('error')
      })
  }, [])

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const allSelected = orders.length > 0 && selected.size === orders.length
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(orders.map((o) => o._id)))

  const schedule = async () => {
    setBusy(true)
    setError('')
    setNote('')
    try {
      const { count } = await createBatchPickup(
        [...selected],
        pickupDate,
        `${pickupTime}:00`,
      )
      // Booked orders are now dispatched — drop them from the list.
      setOrders((os) => os.filter((o) => !selected.has(o._id)))
      setSelected(new Set())
      setNote(`Pickup booked for ${count} order${count === 1 ? '' : 's'}.`)
    } catch (e) {
      setError(e.message || 'Could not schedule the pickup.')
    } finally {
      setBusy(false)
    }
  }

  // Open the label tab synchronously on the click, then redirect it once the
  // URL is fetched — avoids the browser's popup blocker.
  const printLabel = (id) => {
    const win = window.open('', '_blank')
    getOrderLabel(id)
      .then((url) => {
        if (win) win.location = url
      })
      .catch(() => {
        if (win) win.close()
      })
  }

  return (
    <AdminPageShell backTo="/admin" backLabel="Dashboard" dark wide>
      <p className="eyebrow text-dusk">Pickups</p>
      <h1 className="mt-2 font-display text-4xl font-light tracking-tight text-canvas">
        Ready for pickup
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-canvas/55">
        Manifested orders awaiting a courier. Tick the parcels going out, pick
        a slot, and book one pickup to collect them all.
      </p>

      {status === 'loading' && (
        <p className="mt-10 text-sm text-canvas/55">Loading…</p>
      )}
      {status === 'error' && <p className="mt-10 text-sm text-dusk">{error}</p>}

      {status === 'ready' && orders.length === 0 && (
        <div className="mt-10 border-y border-canvas/15 py-20 text-center">
          <p className="font-display text-2xl font-light text-canvas">
            Nothing waiting
          </p>
          <p className="mt-2 text-sm text-canvas/55">
            {note ||
              'Manifest an order from the Orders page to make it ready for pickup.'}
          </p>
        </div>
      )}

      {status === 'ready' && orders.length > 0 && (
        <>
          {/* Schedule bar */}
          <div className="mt-9 flex flex-wrap items-end gap-x-7 gap-y-4 border-y border-canvas/12 py-4">
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow text-canvas/40">Pickup date</span>
              <input
                type="date"
                value={pickupDate}
                min={todayStr()}
                onChange={(e) => setPickupDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="border-b border-canvas/25 bg-transparent py-1 text-sm text-canvas transition-colors focus:border-canvas/60 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow text-canvas/40">Pickup time</span>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="border-b border-canvas/25 bg-transparent py-1 text-sm text-canvas transition-colors focus:border-canvas/60 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={schedule}
              disabled={busy || selected.size === 0}
              className="eyebrow cursor-pointer rounded-full border border-canvas px-5 py-2.5 text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Booking…' : `Schedule pickup (${selected.size})`}
            </button>
            {note && <p className="text-sm text-canvas/70">{note}</p>}
            {error && <p className="text-sm text-dusk">{error}</p>}
          </div>

          <button
            type="button"
            onClick={toggleAll}
            className="eyebrow mt-5 cursor-pointer text-canvas/45 transition-colors hover:text-canvas"
          >
            {allSelected ? 'Clear selection' : 'Select all'}
          </button>

          <ul className="mt-3 divide-y divide-canvas/8 border-y border-canvas/8">
            {orders.map((o) => (
              <li key={o._id}>
                <label className="flex cursor-pointer items-center gap-4 px-1 py-3.5">
                  <input
                    type="checkbox"
                    checked={selected.has(o._id)}
                    onChange={() => toggle(o._id)}
                    style={{ accentColor: '#fbfaf6' }}
                    className="h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-canvas">
                      #{orderNoOf(o)}{' '}
                      <span className="text-canvas/45">
                        · {customerOf(o)} · {o.shippingAddress.city}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-canvas/45">
                      {itemCountOf(o)} {itemCountOf(o) === 1 ? 'item' : 'items'}{' '}
                      · waybill {o.trackingId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault() // don't toggle the checkbox
                      printLabel(o._id)
                    }}
                    className="eyebrow shrink-0 cursor-pointer text-canvas/45 transition-colors hover:text-canvas"
                  >
                    Print label
                  </button>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminPageShell>
  )
}
