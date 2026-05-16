import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logout } from '../../features/auth/authSlice'

/**
 * Shared chrome for every admin page — a top bar with a back link
 * (left) and a Sign out control + the SONARI wordmark (right), then a
 * centered content container.
 *
 * `dark` flips the whole page to the ink theme and drops the header
 * border — used only by the dashboard.
 */
export default function AdminPageShell({
  backTo,
  backLabel = 'Back',
  dark = false,
  children,
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await dispatch(logout())
    navigate('/')
  }

  return (
    <div className={`min-h-screen ${dark ? 'bg-ink text-canvas' : 'bg-canvas'}`}>
      <header
        className={`flex items-center justify-between px-6 py-6 sm:px-10 ${
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
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={handleSignOut}
            className={`eyebrow cursor-pointer transition-colors ${
              dark
                ? 'text-canvas/55 hover:text-canvas'
                : 'text-clay hover:text-ink'
            }`}
          >
            Sign out
          </button>
          <Link
            to="/"
            className={`-mr-[0.4em] font-display text-xl font-light tracking-[0.4em] ${
              dark ? 'text-canvas' : 'text-ink'
            }`}
          >
            SONARI
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-14 sm:px-10">{children}</div>
    </div>
  )
}
