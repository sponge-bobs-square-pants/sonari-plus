import { useState } from 'react'
import Reveal from '../ui/Reveal'
import { BRAND } from '../../data/brand'

/** Email capture — calm, centered, on the oat surface before the footer. */
export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | error | done

  function handleSubmit(e) {
    e.preventDefault()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!valid) {
      setStatus('error')
      return
    }
    // TODO: POST to the API once the backend newsletter route exists.
    setStatus('done')
    setEmail('')
  }

  return (
    // The top padding clears the fixed navbar — and because it lives on
    // this oat block (not the colourless closing <section>), the oat
    // background runs right up behind the navbar, leaving no seam.
    <div className="bg-oat pt-[var(--header-height)]">
      <div className="mx-auto max-w-xl px-6 py-9 text-center">
        <Reveal>
          <p className="eyebrow text-clay">Stay close</p>
          <h2 className="mt-4 font-display text-3xl font-light tracking-tight text-ink">
            First look, slow mornings
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-clay">
            New arrivals, quiet offers and the occasional note on sleeping
            better. No noise — we promise.
          </p>

          {status === 'done' ? (
            <p className="mt-10 font-display text-lg font-light text-ink">
              Thank you — welcome to {BRAND.name}. ♡
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7">
              <div className="flex items-end gap-4 border-b border-ink/30 pb-2 transition-colors focus-within:border-ink">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setStatus('idle')
                  }}
                  placeholder="Your email address"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-clay/70 focus:outline-none"
                  aria-label="Email address"
                />
                <button
                  type="submit"
                  className="eyebrow shrink-0 cursor-pointer text-ink transition-colors hover:text-clay"
                >
                  Join →
                </button>
              </div>
              {status === 'error' && (
                <p className="mt-3 text-left text-xs text-dusk">
                  Please enter a valid email address.
                </p>
              )}
            </form>
          )}
        </Reveal>
      </div>
    </div>
  )
}
