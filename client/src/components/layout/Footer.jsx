import { Link } from 'react-router-dom'
import Wordmark from '../brand/Wordmark'
import { BRAND } from '../../data/brand'

// Items are plain strings (placeholder `#` links) or { label, to }
// objects for ones with a real page.
const COLUMNS = [
  {
    title: 'Shop',
    items: [
      { label: 'Cordset', to: '/shop?category=nightwear' },
      { label: 'Night wear', to: '/shop?category=nightdresses' },
      { label: 'Bras', to: '/shop?category=bras' },
      { label: 'Panties', to: '/shop?category=panties' },
      { label: 'Kids', to: '/shop?category=kids' },
      { label: 'New In', to: '/shop?tag=New' },
    ],
  },
  {
    title: 'Help',
    items: [
      { label: 'Size guide', to: '/size-guide' },
      { label: 'Delivery & returns', to: '/refund' },
      { label: 'Fabric care', to: '/fabric-care' },
      { label: 'Contact us', to: '/contact' },
    ],
  },
  {
    title: BRAND.name,
    items: [
      { label: 'Our story', to: '/about' },
      { label: 'Sustainability', to: '/sustainability' },
      { label: 'Stockists', to: '/stockists' },
      { label: 'Journal', to: '/journal' },
    ],
  },
]

// Social links — disabled until the brand opens the actual accounts.
// Uncomment SOCIALS + the rendering block in the lower bar to bring back.
// const SOCIALS = ['Instagram', 'Pinterest', 'Facebook']

const LEGAL = [
  { label: 'Privacy policy', to: '/privacy' },
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Refund & Cancellation', to: '/refund' },
]

export default function Footer() {
  return (
    <footer className="bg-ink text-canvas">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_2fr]">
          {/* Brand */}
          <div>
            <Wordmark className="h-16 w-auto" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-canvas/55">
              Modal and cotton sleepwear, night suits and intimates — made
              for how you actually sleep.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="eyebrow text-[0.625rem] text-dusk">{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {col.items.map((item) => {
                    const label = typeof item === 'string' ? item : item.label
                    const to = typeof item === 'string' ? null : item.to
                    const cls =
                      'text-sm text-canvas/65 transition-colors hover:text-canvas'
                    return (
                      <li key={label}>
                        {to ? (
                          <Link to={to} className={cls}>
                            {label}
                          </Link>
                        ) : (
                          <a href="#" className={cls}>
                            {label}
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Lower bar */}
        <div className="mt-6 flex flex-col gap-5 border-t border-canvas/12 pt-6 text-xs text-canvas/45 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <p>
              © {new Date().getFullYear()} {BRAND.legalName} Nightwear. All
              rights reserved.
            </p>
            <ul className="flex gap-5">
              {LEGAL.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="transition-colors hover:text-canvas"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Socials disabled — accounts not yet open. Uncomment when ready.
          <ul className="flex gap-6">
            {SOCIALS.map((s) => (
              <li key={s}>
                <a
                  href="#"
                  className="uppercase tracking-[0.14em] transition-colors hover:text-canvas"
                >
                  {s}
                </a>
              </li>
            ))}
          </ul>
          */}
        </div>
      </div>
    </footer>
  )
}
