import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import {
  selectCartItems,
  selectCartTotal,
  setCart,
} from '../features/cart/cartSlice'
import { selectAuthUser, loadUser } from '../features/auth/authSlice'
import { createOrder, verifyPayment } from '../services/orderApi'
import { loadRazorpay } from '../utils/razorpay'
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '../data/shipping'
import { BRAND } from '../data/brand'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import { formatPrice } from '../utils/format'

const EMPTY_ADDRESS = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
}
const REQUIRED = ['fullName', 'phone', 'line1', 'city', 'state', 'pincode']

/** A saved address, rendered as a one-line-per-part block. */
function AddressLines({ address }) {
  return (
    <p className="mt-1 text-xs leading-relaxed text-clay">
      {address.line1}
      {address.line2 ? `, ${address.line2}` : ''}
      <br />
      {address.city}, {address.state} {address.pincode}
      <br />
      {address.phone}
    </p>
  )
}

export default function CheckoutPage() {
  const items = useSelector(selectCartItems)
  const subtotal = useSelector(selectCartTotal)
  const user = useSelector(selectAuthUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const savedAddresses = user?.addresses ?? []

  // 'pick' an existing address, or fill a 'new' one. Start on whichever
  // makes sense for this customer.
  const [mode, setMode] = useState(
    savedAddresses.length > 0 ? 'pick' : 'new',
  )
  const [selectedId, setSelectedId] = useState(
    savedAddresses[0]?._id ?? null,
  )
  const [address, setAddress] = useState({
    ...EMPTY_ADDRESS,
    fullName: user?.name || '',
  })
  const [saveAddress, setSaveAddress] = useState(false)

  const [status, setStatus] = useState('idle') // idle | paying | error
  const [error, setError] = useState('')

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const total = subtotal + deliveryFee

  const field = (key) => (e) => {
    setAddress((a) => ({ ...a, [key]: e.target.value }))
    if (status === 'error') setStatus('idle')
  }

  async function handlePay() {
    let shipping
    let saveFlag = false

    if (mode === 'pick') {
      shipping = savedAddresses.find((a) => a._id === selectedId)
      if (!shipping) {
        setStatus('error')
        setError('Please choose a delivery address.')
        return
      }
    } else {
      const missing = REQUIRED.filter((f) => !address[f].trim())
      if (missing.length) {
        setStatus('error')
        setError('Please fill in every required field.')
        return
      }
      shipping = address
      saveFlag = saveAddress
    }

    setStatus('paying')
    setError('')

    const ready = await loadRazorpay()
    if (!ready) {
      setStatus('error')
      setError('Could not reach the payment service. Please try again.')
      return
    }

    let data
    try {
      data = await createOrder(shipping, saveFlag)
    } catch (err) {
      setStatus('error')
      setError(err.message)
      return
    }

    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      order_id: data.razorpayOrderId,
      name: `${BRAND.legalName} Nightwear`,
      description: 'Order payment',
      prefill: {
        name: shipping.fullName,
        email: user?.email || '',
        contact: shipping.phone,
      },
      theme: { color: '#2e2a26' },
      handler: async (response) => {
        try {
          const order = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          dispatch(setCart([])) // server already emptied the DB cart
          dispatch(loadUser()) // refresh in case an address was saved
          navigate('/order/confirmed', { state: { order }, replace: true })
        } catch (err) {
          setStatus('error')
          setError(err.message || 'We could not confirm your payment.')
        }
      },
      modal: {
        ondismiss: () => setStatus('idle'),
      },
    })
    rzp.open()
  }

  /* Empty cart — nothing to check out */
  if (items.length === 0) {
    return (
      <>
        <Header solid border={false} />
        <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
          <h1 className="font-display text-2xl font-light text-ink">
            Your bag is empty
          </h1>
          <p className="mt-2 text-sm text-clay">
            Add something before checking out.
          </p>
          <Button as={Link} to="/shop" variant="outline" className="mt-8">
            Browse the collection
          </Button>
        </main>
      </>
    )
  }

  return (
    <>
      <Header solid border={false} />

      <main className="min-h-screen bg-canvas px-6 pb-24 pt-32">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow text-clay">Checkout</p>
          <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-ink md:text-5xl">
            Shipping &amp; payment
          </h1>

          <div className="mt-12 grid gap-14 md:grid-cols-[1.3fr_1fr] md:gap-20">
            {/* Delivery address */}
            <div>
              <p className="eyebrow text-clay">Delivery address</p>

              {mode === 'pick' ? (
                <div className="mt-6">
                  {/* Scrolls within itself once the list is long */}
                  <div className="max-h-[20rem] space-y-3 overflow-y-auto pr-1">
                    {savedAddresses.map((addr) => {
                      const active = selectedId === addr._id
                      return (
                        <button
                          key={addr._id}
                          type="button"
                          onClick={() => setSelectedId(addr._id)}
                          className={`block w-full border p-4 text-left transition-colors ${
                            active
                              ? 'border-ink'
                              : 'border-linen hover:border-greige'
                          }`}
                        >
                          <p className="text-sm text-ink">{addr.fullName}</p>
                          <AddressLines address={addr} />
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('new')}
                    className="eyebrow mt-4 inline-flex cursor-pointer items-center gap-2 text-clay transition-colors hover:text-ink"
                  >
                    <span className="text-base leading-none">+</span> Add a new
                    address
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  <TextField
                    label="Full name"
                    value={address.fullName}
                    onChange={field('fullName')}
                  />
                  <TextField
                    label="Phone number"
                    value={address.phone}
                    onChange={field('phone')}
                  />
                  <TextField
                    label="Address line 1"
                    value={address.line1}
                    onChange={field('line1')}
                  />
                  <TextField
                    label="Address line 2 (optional)"
                    value={address.line2}
                    onChange={field('line2')}
                  />
                  <div className="grid gap-6 sm:grid-cols-3">
                    <TextField
                      label="City"
                      value={address.city}
                      onChange={field('city')}
                    />
                    <TextField
                      label="State"
                      value={address.state}
                      onChange={field('state')}
                    />
                    <TextField
                      label="Pincode"
                      value={address.pincode}
                      onChange={field('pincode')}
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-ink"
                    />
                    <span className="text-sm text-clay">
                      Save this address to my account
                    </span>
                  </label>

                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMode('pick')}
                      className="eyebrow inline-flex cursor-pointer items-center gap-2 text-clay transition-colors hover:text-ink"
                    >
                      <span>←</span> Use a saved address
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Order summary + pay */}
            <aside>
              <div className="border border-linen p-7">
                <p className="eyebrow text-clay">Your order</p>

                <ul className="mt-5 space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.lineId}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span className="text-ink">
                        {item.name}
                        <span className="text-clay"> × {item.quantity}</span>
                      </span>
                      <span className="shrink-0 text-ink">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <dl className="mt-5 space-y-2 border-t border-linen pt-5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-clay">Subtotal</dt>
                    <dd className="text-ink">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-clay">Delivery</dt>
                    <dd className="text-ink">
                      {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-baseline justify-between border-t border-linen pt-4">
                  <span className="eyebrow text-clay">Total</span>
                  <span className="font-display text-2xl font-light text-ink">
                    {formatPrice(total)}
                  </span>
                </div>

                {error && <p className="mt-4 text-xs text-dusk">{error}</p>}

                <Button
                  variant="solid"
                  className="mt-6 w-full"
                  onClick={handlePay}
                  disabled={status === 'paying'}
                >
                  {status === 'paying'
                    ? 'Processing…'
                    : `Pay ${formatPrice(total)}`}
                </Button>

                <p className="mt-4 text-xs leading-relaxed text-clay">
                  By placing this order you agree to our{' '}
                  <Link
                    to="/terms"
                    className="text-ink underline underline-offset-2 transition-colors hover:text-clay"
                  >
                    Terms &amp; Conditions
                  </Link>{' '}
                  and{' '}
                  <Link
                    to="/refund"
                    className="text-ink underline underline-offset-2 transition-colors hover:text-clay"
                  >
                    Refund &amp; Cancellation Policy
                  </Link>
                  .
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}
