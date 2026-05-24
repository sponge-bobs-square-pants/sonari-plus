import { Link } from 'react-router-dom'
import Wordmark from '../brand/Wordmark'

/**
 * Shared chrome for every admin page — a top bar with a back link
 * (left) and the nuit wordmark (right), then a centered content container.
 * (Sign out lives on the dashboard, not here.)
 *
 * `dark` flips the whole page to the ink theme and drops the header
 * border — used only by the dashboard.
 *
 * `wide` widens the content container (`max-w-7xl`) — for grid-heavy pages
 * like the product catalogue. `full` drops the width cap AND, on desktop,
 * pins the page to the viewport height with the content area as a fill
 * flex-column — for full-bleed master/detail tools like the orders page.
 *
 * `fit` pins the page to the viewport height and scrolls the CONTENT AREA
 * internally rather than the window — the page itself never scrolls.
 */
export default function AdminPageShell({
  backTo,
  backLabel = 'Back',
  dark = false,
  wide = false,
  full = false,
  fit = false,
  children,
}) {
  return (
    <div
      className={`${
        fit
          ? 'flex h-screen flex-col overflow-hidden'
          : full
            ? 'min-h-screen lg:flex lg:h-screen lg:flex-col lg:overflow-hidden'
            : 'min-h-screen'
      } ${dark ? 'bg-ink text-canvas' : 'bg-canvas'}`}
    >
      <header
        className={`flex shrink-0 items-center justify-between px-6 py-4 sm:px-10 ${
          dark ? '' : 'border-b border-linen'
        }`}
      >
        <Link
          to={backTo}
          className={`eyebrow group flex items-center gap-2 transition-colors ${
            dark
              ? 'text-canvas/55 hover:text-canvas'
              : 'text-clay hover:text-ink'
          }`}
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
          {backLabel}
        </Link>
        <Link
          to="/"
          className={`flex items-center ${dark ? 'text-canvas' : 'text-ink'}`}
        >
          <Wordmark className="h-12 w-auto" label="nuit — home" />
        </Link>
      </header>

      <div
        className={`mx-auto w-full px-6 sm:px-10 ${
          fit ? 'min-h-0 flex-1 overflow-y-auto scrollbar-hide' : ''
        } ${
          full
            ? 'max-w-none pt-1 pb-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col'
            : `py-14 ${wide ? 'max-w-7xl' : 'max-w-4xl'}`
        }`}
      >
        {children}
      </div>
    </div>
  )
}
