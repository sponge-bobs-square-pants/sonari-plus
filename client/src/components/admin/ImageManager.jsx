import { useState } from 'react'
import { uploadImage } from '../../services/productApi'

/**
 * Manage an ordered list of image URLs — upload (multiple at once),
 * reorder with ‹ ›, and remove. The array order IS the display
 * sequence; the first image is the cover.
 *
 * Dark-themed, for the admin product form.
 *
 * Props:
 *   images   — string[] of Cloudinary URLs
 *   onChange — (nextImages) => void
 */
export default function ImageManager({ images, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (e) => {
    const files = [...e.target.files]
    e.target.value = '' // let the same file be picked again later
    if (!files.length) return

    setUploading(true)
    setError('')
    try {
      // Promise.all preserves order, so uploads land in pick order.
      const urls = await Promise.all(files.map(uploadImage))
      onChange([...images, ...urls])
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Swap an image with its neighbour to reorder.
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= images.length) return
    const next = [...images]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const remove = (i) => onChange(images.filter((_, idx) => idx !== i))

  return (
    <div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={`${url}-${i}`} className="w-20">
              <div className="relative h-24 w-20 overflow-hidden border border-canvas/15">
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-0 top-0 bg-canvas px-1.5 py-0.5 text-[0.5rem] uppercase tracking-[0.12em] text-ink">
                    Cover
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between text-canvas/55">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move earlier"
                  className="cursor-pointer px-1 text-base leading-none transition-colors hover:text-canvas disabled:cursor-not-allowed disabled:opacity-25"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove image"
                  className="cursor-pointer px-1 text-sm leading-none transition-colors hover:text-dusk"
                >
                  ×
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  aria-label="Move later"
                  className="cursor-pointer px-1 text-base leading-none transition-colors hover:text-canvas disabled:cursor-not-allowed disabled:opacity-25"
                >
                  ›
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="eyebrow mt-3 inline-block cursor-pointer border border-canvas/40 px-5 py-3 text-canvas transition-colors hover:bg-canvas hover:text-ink">
        {uploading
          ? 'Uploading…'
          : images.length
            ? 'Add more images'
            : 'Upload images'}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {error && <p className="mt-2 text-xs text-dusk">{error}</p>}
    </div>
  )
}
