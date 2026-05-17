import { Link, useLocation } from 'react-router-dom'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import { formatPrice } from '../utils/format'

/**
 * /order/confirmed — shown right after a successful payment. The order
 * arrives via router state from the checkout page; a direct visit (no
 * state) falls back to a gentle pointer to the account area.
 */
export default function OrderConfirmationPage() {
  const { state } = useLocation()
  const order = state?.order

  return (
    <>
      <Header solid border={false} />

      <main className="min-h-screen bg-canvas px-6 pb-24 pt-32">
        <div className="mx-auto max-w-xl text-center">
          {order ? (
            <>
              <p className="eyebrow text-clay">Order confirmed</p>
              <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-ink md:text-5xl">
                Thank you ♡
              </h1>
              <p className="mt-5 text-sm leading-relaxed text-clay">
                Your order has been placed and paid for. We&apos;ll send a
                confirmation by email and let you know as soon as it ships.
              </p>

              <div className="mt-10 border border-linen p-7 text-left">
                <div className="flex justify-between text-sm">
                  <span className="eyebrow text-clay">Order</span>
                  <span className="text-ink">
                    #{order._id.slice(-8).toUpperCase()}
                  </span>
                </div>

                <ul className="mt-5 space-y-2 border-t border-linen pt-5">
                  {order.items.map((item, i) => (
                    <li
                      key={i}
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

                <div className="mt-5 flex items-baseline justify-between border-t border-linen pt-5">
                  <span className="eyebrow text-clay">Total paid</span>
                  <span className="font-display text-xl font-light text-ink">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <Button as={Link} to="/account" variant="solid">
                  View your orders
                </Button>
                <Button as={Link} to="/shop" variant="outline">
                  Continue shopping
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-light text-ink">
                Nothing to show here
              </h1>
              <p className="mt-3 text-sm text-clay">
                This page appears right after you place an order.
              </p>
              <Button
                as={Link}
                to="/account"
                variant="outline"
                className="mt-8"
              >
                Go to your account
              </Button>
            </>
          )}
        </div>
      </main>
    </>
  )
}
