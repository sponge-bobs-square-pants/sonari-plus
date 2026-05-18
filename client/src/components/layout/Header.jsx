import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { selectCartCount } from '../../features/cart/cartSlice'
import { selectAuthUser } from '../../features/auth/authSlice'
import useScrolled from '../../hooks/useScrolled'
import Icon from '../ui/Icon'
import Wordmark from '../brand/Wordmark'
import AnnouncementBar from './AnnouncementBar'
import MenuOverlay from './MenuOverlay'

/**
 * The solid (scrolled / forced) background, matched to the section behind
 * it. Fully OPAQUE on purpose — a translucent bar picks up whatever sits
 * under it (e.g. the dark Hero image the landing navbar overlays), which
 * leaves a visible seam against the section it should be matching.
 */
const SOLID_BG = {
  canvas: 'bg-canvas',
  oat: 'bg-oat',
  white: 'bg-white',
}

/**
 * Three-zone header: menu button (left) · wordmark (center) ·
 * utilities (right). All navigation now lives in the full-screen
 * MenuOverlay, so the bar itself stays minimal at every width.
 */
export default function Header({
  solid = false,
  border = true,
  announcement = false,
  surface = 'canvas',
}) {
  const scrolled = useScrolled(80)
  const [menuOpen, setMenuOpen] = useState(false)
  const cartCount = useSelector(selectCartCount)
  const user = useSelector(selectAuthUser)

  // Solid when scrolled past the hero — or always, on pages with no
  // dark hero behind the header (passed `solid`).
  const isSolid = solid || scrolled
  const tone = isSolid ? 'text-ink' : 'text-canvas'

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        {announcement && <AnnouncementBar />}

        <nav
          className={`transition-colors duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${tone} ${
            isSolid
              ? `${border ? 'border-b border-linen ' : ''}${
                  SOLID_BG[surface] ?? SOLID_BG.canvas
                }`
              : 'bg-transparent'
          }`}
        >
          {/* Full-bleed row (no max-w-7xl): the menu button hugs the
              left edge so it lands on the exact same x as the
              MenuOverlay's close button. Fixed 68px height matches too. */}
          <div className="grid h-[68px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6">
            {/* Left — menu trigger */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="cursor-pointer opacity-80 transition-opacity hover:opacity-100"
                aria-label="Open menu"
              >
                <Icon name="menu" />
              </button>
            </div>

            {/* Center — wordmark, links home */}
            <Link to="/" className="flex items-center">
              <Wordmark className="h-16 w-auto" label="nuit — home" />
            </Link>

            {/* Right — utilities */}
            <div className="flex items-center justify-end gap-5">
              <Link
                to={
                  user
                    ? user.role === 'admin'
                      ? '/admin'
                      : '/account'
                    : '/login'
                }
                className="cursor-pointer opacity-80 transition-opacity hover:opacity-100"
                aria-label={user ? 'Your account' : 'Log in'}
              >
                <Icon name="user" />
              </Link>
              <Link
                to="/cart"
                className="relative cursor-pointer opacity-80 transition-opacity hover:opacity-100"
                aria-label={`Bag, ${cartCount} items`}
              >
                <Icon name="bag" />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-dusk px-1 text-[0.6rem] font-medium text-canvas">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {menuOpen && (
        <MenuOverlay
          onClose={() => setMenuOpen(false)}
          announcement={announcement}
        />
      )}
    </>
  )
}
