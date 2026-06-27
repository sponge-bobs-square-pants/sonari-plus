import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { pollOrderVerify } from '../services/orderApi'
import { setCart } from '../features/cart/cartSlice'
import { loadUser } from '../features/auth/authSlice'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'

/**
 * /order/processing — the landing page customers reach after PhonePe's
 * full-page checkout. We don't trust the redirect query alone (PhonePe
 * doesn't sign it); we hit our own /verify which calls PhonePe's status
 * API server-side. That API can briefly say PENDING right after a
 * successful payment, so we poll up to a few times before giving up.
 *
 * Three terminal states: success → /order/confirmed; failed → error
 * card with a "Try again" link to /cart; pending after retries → "Still
 * checking…" copy with a manual refresh affordance.
 */

const POLL_INTERVAL_MS = 2_500
const MAX_POLLS = 8 // ~20s total before falling through to manual refresh

export default function OrderProcessingPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const orderId = params.get('orderId')

  const [phase, setPhase] = useState('checking') // checking | pending | error
  const [error, setError] = useState('')
  // Survives StrictMode's double-effect — we still increment but cap with
  // the ref so the request count stays predictable.
  const polls = useRef(0)

  useEffect(() => {
    if (!orderId) {
      setPhase('error')
      setError("We couldn't find your order reference.")
      return undefined
    }

    let cancelled = false
    async function tick() {
      try {
        const data = await pollOrderVerify(orderId)
        if (cancelled) return
        if (data?.order) {
          // Paid — server already emptied the DB cart.
          dispatch(setCart([]))
          dispatch(loadUser())
          navigate('/order/confirmed', {
            state: { order: data.order },
            replace: true,
          })
          return
        }
        // 202 with `{ status: 'pending' }` — try again unless we've capped.
        polls.current += 1
        if (polls.current >= MAX_POLLS) {
          setPhase('pending')
          return
        }
        setTimeout(tick, POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        setPhase('error')
        setError(err.message || 'We could not confirm your payment.')
      }
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [orderId, navigate, dispatch])

  return (
    <>
      <Header solid border={false} />
      <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
        {phase === 'checking' && (
          <>
            <p className="eyebrow text-clay">Confirming your payment</p>
            <h1 className="mt-4 font-display text-3xl font-light text-ink md:text-4xl">
              Hang on a moment…
            </h1>
            <p className="mt-3 max-w-md text-sm text-clay">
              We're checking with the payment provider. This usually takes a
              few seconds — please don't close this tab.
            </p>
          </>
        )}

        {phase === 'pending' && (
          <>
            <p className="eyebrow text-clay">Still checking</p>
            <h1 className="mt-4 font-display text-3xl font-light text-ink md:text-4xl">
              Your payment is still processing.
            </h1>
            <p className="mt-3 max-w-md text-sm text-clay">
              You may safely refresh this page in a minute, or check your
              account — confirmed orders appear under Purchases.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button onClick={() => window.location.reload()} variant="solid">
                Check again
              </Button>
              <Button as={Link} to="/account" variant="outline">
                Open my account
              </Button>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="eyebrow text-dusk">Payment not confirmed</p>
            <h1 className="mt-4 font-display text-3xl font-light text-ink md:text-4xl">
              Something didn't go through.
            </h1>
            <p className="mt-3 max-w-md text-sm text-clay">
              {error || 'Your payment could not be confirmed. No charge has been captured for this order.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button as={Link} to="/cart" variant="solid">
                Return to bag
              </Button>
              <Button as={Link} to="/shop" variant="outline">
                Continue shopping
              </Button>
            </div>
          </>
        )}
      </main>
    </>
  )
}
