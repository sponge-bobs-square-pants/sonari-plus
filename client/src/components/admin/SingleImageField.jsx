import { useState } from 'react'
import { uploadImage } from '../../services/productApi'
import Placeholder from '../ui/Placeholder'

/**
 * Upload / replace / remove a single image. Stores one URL string
 * (unlike ImageManager, which manages an ordered array).
 * Dark-themed, for the admin product form.
 *
 * Props:
 *   value    — current image URL ('' if none)
 *   onChange — (url) => void  ('' clears it)
 */
export default function SingleImageField({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      onChange(await uploadImage(file))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-5">
      <Placeholder
        src={value || undefined}
        tone="rose"
        mark={!value}
        className="h-28 w-24 shrink-0"
      />
      <div>
        <div className="flex items-center gap-4">
          <label className="eyebrow inline-block cursor-pointer border border-canvas/40 px-5 py-3 text-canvas transition-colors hover:bg-canvas hover:text-ink">
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="eyebrow cursor-pointer text-canvas/55 transition-colors hover:text-dusk"
            >
              Remove
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-dusk">{error}</p>}
      </div>
    </div>
  )
}
