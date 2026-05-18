import { Link } from 'react-router-dom'
import Placeholder from '../ui/Placeholder'
import { BRAND } from '../../data/brand'

/**
 * Shared shell for the login & signup pages — a 50/50 split with the
 * form on the left and a full-height tonal image on the right,
 * echoing the menu overlay's layout.
 */
export default function AuthLayout({ intro, title, children, footer }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-10 md:px-14">
        <Link
          to="/"
          className="eyebrow group flex w-fit items-center gap-2 text-clay transition-colors hover:text-ink"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
          Back to {BRAND.name}
        </Link>

        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="mx-auto w-full max-w-sm">
            <p className="eyebrow text-clay">{intro}</p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-tight text-ink md:text-4xl">
              {title}
            </h1>
            <div className="mt-9">{children}</div>
            {footer && <p className="mt-8 text-sm text-clay">{footer}</p>}
          </div>
        </div>
      </div>

      {/* Image side */}
      <div className="relative hidden md:block">
        <Placeholder tone="rose" mark={false} className="h-full w-full" />
      </div>
    </div>
  )
}
