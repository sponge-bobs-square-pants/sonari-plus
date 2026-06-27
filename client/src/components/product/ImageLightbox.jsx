import { useCallback, useEffect, useState } from 'react'
import Icon from '../ui/Icon'

/**
 * Full-screen product-image lightbox.
 *
 * Interaction model — calm-gallery, not busy modal:
 * - The dark backdrop (bg-ink/95) carries the click-to-close handler;
 *   children stopPropagation so clicks on the image, controls or
 *   counter never bubble up and accidentally close it.
 * - Image starts at "fit" (contained inside 90vw × 90vh). Click it to
 *   enter zoom (2.5×) centered on the click point. Once zoomed, the
 *   transform-origin tracks mouse position (hover-pan, the Mr Porter
 *   pattern) — so the customer "explores" the image with their cursor.
 *   Click again (or click outside) to exit zoom.
 * - Multi-image galleries get chevrons + arrow-key navigation + an
 *   index counter. A change of image always resets the zoom state so
 *   the next photo opens "fit" rather than at the prior pan position.
 * - ESC closes; body scroll is locked while mounted so the page behind
 *   doesn't drift when the customer is exploring a zoomed photo.
 *
 * Touch (mobile): tap-to-zoom toggles, exactly as on desktop. We don't
 * implement pinch/drag explicitly — the tap interaction covers the
 * primary "see it bigger" need, and browsers' native pinch on the
 * image element handles the rest once zoomed.
 */
const ZOOM = 2.5

export default function ImageLightbox({
  images,
  initialIndex = 0,
  alt = '',
  onClose,
}) {
  const [index, setIndex] = useState(initialIndex)
  const [zoomed, setZoomed] = useState(false)
  // Transform-origin position as a percentage (0-100). Default centre.
  const [origin, setOrigin] = useState({ x: 50, y: 50 })

  const total = images?.length || 0
  const hasNav = total > 1

  const reset = useCallback(() => {
    setZoomed(false)
    setOrigin({ x: 50, y: 50 })
  }, [])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total)
    reset()
  }, [total, reset])

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total)
    reset()
  }, [total, reset])

  // Keyboard: ESC closes, arrows navigate.
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (hasNav && e.key === 'ArrowLeft') goPrev()
      else if (hasNav && e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hasNav, goPrev, goNext, onClose])

  // Lock body scroll for the duration of the lightbox so the page
  // behind doesn't drift while the customer pans.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Compute the click point as a percentage of the image's box, used
  // both as the zoom-in origin and as the moving pan origin.
  const positionFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    }
  }

  const handleImageClick = (e) => {
    e.stopPropagation()
    if (zoomed) {
      reset()
    } else {
      setOrigin(positionFromEvent(e))
      setZoomed(true)
    }
  }

  const handleMove = (e) => {
    if (!zoomed) return
    setOrigin(positionFromEvent(e))
  }

  const stop = (e) => e.stopPropagation()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt ? `${alt} — enlarged view` : 'Enlarged product image'}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 backdrop-blur-sm"
    >
      {/* Image — overflow-hidden clips the scaled content to its box so
          the zoom doesn't visually leak over neighbouring chrome. */}
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden"
        onClick={stop}
      >
        <img
          src={images[index]}
          alt={alt}
          onClick={handleImageClick}
          onMouseMove={handleMove}
          draggable={false}
          style={{
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transform: zoomed ? `scale(${ZOOM})` : 'scale(1)',
            transition: 'transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1)',
            cursor: zoomed ? 'zoom-out' : 'zoom-in',
          }}
          className="block max-h-[90vh] max-w-[90vw] select-none object-contain"
        />
      </div>

      {/* Close — always visible, top-right */}
      <button
        type="button"
        onClick={(e) => {
          stop(e)
          onClose()
        }}
        aria-label="Close enlarged view"
        className="absolute right-6 top-6 flex h-10 w-10 cursor-pointer items-center justify-center text-canvas/60 transition-colors hover:text-canvas"
      >
        <Icon name="close" className="h-6 w-6" />
      </button>

      {/* Prev / next — only when there's more than one image */}
      {hasNav && (
        <>
          <button
            type="button"
            onClick={(e) => {
              stop(e)
              goPrev()
            }}
            aria-label="Previous image"
            className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center text-canvas/60 transition-colors hover:text-canvas"
          >
            <Icon name="chevron-left" className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              stop(e)
              goNext()
            }}
            aria-label="Next image"
            className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center text-canvas/60 transition-colors hover:text-canvas"
          >
            <Icon name="chevron-right" className="h-7 w-7" />
          </button>

          {/* Bottom counter — eyebrow style, matches the rest of the brand UI */}
          <span
            onClick={stop}
            className="eyebrow absolute bottom-6 left-1/2 -translate-x-1/2 text-[0.625rem] text-canvas/55"
          >
            {index + 1} / {total}
          </span>
        </>
      )}
    </div>
  )
}
