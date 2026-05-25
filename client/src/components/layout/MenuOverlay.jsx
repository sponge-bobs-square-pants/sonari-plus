import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../../data/categories';
import { BRAND } from '../../data/brand';
import Icon from '../ui/Icon';
import Placeholder from '../ui/Placeholder';
import AnnouncementBar from './AnnouncementBar';

/* Primary nav = the shop categories + New In; secondary = brand pages. */
const PRIMARY = [
  ...categories.map((c) => ({ name: c.name, to: `/shop?category=${c.id}` })),
  { name: 'New In', to: '/shop' },
];
const SECONDARY = [
  { label: 'Our story', to: '/about' },
  { label: 'Contact us', to: '/contact' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'Refund', to: '/refund' },
];

/**
 * Full-screen menu takeover (Zara-style).
 *
 * Layout intent:
 *  - The root IS the two-column grid, pinned to the full viewport,
 *    so the right-hand image runs edge-to-edge, top to bottom.
 *  - Only the LEFT column carries an invisible announcement-bar-height
 *    spacer, so the close button lands on the exact pixel the header's
 *    menu button occupies — without pushing the image down.
 *
 * Locks body scroll while open; closes on Escape, the close button,
 * or selecting a link.
 */
export default function MenuOverlay({ onClose, announcement = false }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className='animate-menu-in fixed inset-0 z-[60] grid grid-rows-1 bg-canvas text-ink md:grid-cols-2'>
      {/* LEFT — close, brand, navigation */}
      <div className='flex min-h-0 flex-col'>
        {/* Invisible spacer: only when the header shows the announcement
            bar — reserves its height so the close button stays aligned
            with the header's menu button. */}
        {announcement && (
          <div aria-hidden='true' className='invisible shrink-0'>
            <AnnouncementBar />
          </div>
        )}

        {/* Close row — matches the header nav row's height + padding. */}
        <div className='flex h-[68px] shrink-0 items-center px-6'>
          <button
            type='button'
            onClick={onClose}
            className='cursor-pointer opacity-80 transition-opacity hover:opacity-100'
            aria-label='Close menu'
          >
            <Icon name='close' />
          </button>
        </div>

        {/* Scrollable content — px-6 matches the close row above,
            so the nav lines up directly under the close button. */}
        <div className='flex flex-1 flex-col overflow-y-auto px-6 pb-12 pt-7'>
          {/* Category navigation */}
          <div>
            <p
              className='eyebrow build-x text-clay'
              style={{ animationDelay: '0.2s' }}
            >
              Shop
            </p>
            <ul className='mt-5'>
              {PRIMARY.map((item, i) => (
                <li
                  key={item.name}
                  className='build-x'
                  style={{ animationDelay: `${0.32 + i * 0.085}s` }}
                >
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className='group block py-1.5'
                  >
                    <span className='font-display text-[clamp(1.9rem,4.6vw,3rem)] font-light leading-tight tracking-tight transition-colors duration-300 group-hover:text-clay'>
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Secondary links, pinned to the bottom */}
          <div
            className='animate-fade-up mt-auto flex flex-wrap gap-x-8 gap-y-3 pt-12'
            style={{ animationDelay: '0.7s' }}
          >
            {SECONDARY.map((s) => {
              const label = typeof s === 'string' ? s : s.label;
              const to = typeof s === 'string' ? null : s.to;
              const cls = 'text-sm text-clay transition-colors hover:text-ink';
              return to ? (
                <Link key={label} to={to} onClick={onClose} className={cls}>
                  {label}
                </Link>
              ) : (
                <a key={label} href='#' onClick={onClose} className={cls}>
                  {label}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT — full-height image, top to bottom of the viewport */}
      <div
        className='build-y relative hidden md:block'
        style={{ animationDelay: '0.05s' }}
      >
        <Placeholder tone='rose' mark={false} className='h-full w-full' />
        <div
          className='animate-fade-up absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/60 to-transparent p-12 text-canvas'
          style={{ animationDelay: '0.85s' }}
        >
          <p className='eyebrow text-canvas/70'>Featured</p>
          <p className='mt-2 font-display text-3xl font-light'>
            The {BRAND.name} edit
          </p>
          <a
            href='#'
            onClick={onClose}
            className='eyebrow mt-5 inline-flex items-center gap-3 text-canvas/80 transition-colors hover:text-canvas'
          >
            <span className='h-px w-9 bg-canvas/50' />
            Discover
          </a>
        </div>
      </div>
    </div>
  );
}
