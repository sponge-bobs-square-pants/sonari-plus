import { useEffect } from 'react'
import Button from '../ui/Button'
import Icon from '../ui/Icon'

const SIZES = ['XS', 'S', 'M', 'L', 'XL']

/* Price buckets — exported so ShopPage can use the min/max bounds.
   A bucket matches when:  min <= priceFrom < max  */
export const PRICE_BUCKETS = [
  { id: 'all', label: 'All prices' },
  { id: 'under-500', label: 'Under ₹500', max: 500 },
  { id: '500-1000', label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { id: '1000-2000', label: '₹1,000 – ₹2,000', min: 1000, max: 2000 },
  { id: 'over-2000', label: 'Over ₹2,000', min: 2000 },
]

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
]

// Category is decided by navigation (the URL), not by these filters.
export const EMPTY_FILTERS = { sizes: [], price: 'all' }

function FilterSection({ label, children }) {
  return (
    <div className="border-t border-linen py-6 first:border-t-0">
      <p className="eyebrow text-clay">{label}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function RadioRow({ checked, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 py-1.5 text-left"
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          checked ? 'border-ink' : 'border-greige'
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-ink" />}
      </span>
      <span
        className={`text-sm transition-colors ${checked ? 'text-ink' : 'text-clay'}`}
      >
        {children}
      </span>
    </button>
  )
}

/**
 * Filter & sort modal — overlays the shop page. A bottom sheet on
 * mobile, a centered dialog on larger screens. Filtering is live,
 * so the result count updates as you toggle.
 *
 * Locks body scroll while open; closes on Escape, the backdrop,
 * the × button, or "View results".
 */
export default function FilterModal({
  filters,
  onChange,
  sort,
  onSortChange,
  resultCount,
  onClose,
}) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const toggleSize = (size) =>
    onChange({
      ...filters,
      sizes: filters.sizes.includes(size)
        ? filters.sizes.filter((s) => s !== size)
        : [...filters.sizes, size],
    })

  const hasActive = filters.sizes.length > 0 || filters.price !== 'all'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      {/* Backdrop */}
      <div
        className="animate-fade-in absolute inset-0 bg-ink/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="animate-fade-up relative flex max-h-[85vh] w-full max-w-md flex-col bg-canvas shadow-[0_24px_60px_-20px_rgba(46,42,38,0.45)]">
        <div className="flex items-center justify-between border-b border-linen px-6 py-5">
          <p className="eyebrow text-ink">Filter &amp; sort</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-clay transition-colors hover:text-ink"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <FilterSection label="Size">
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => {
                const on = filters.sizes.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`h-10 w-12 cursor-pointer border text-xs transition-colors ${
                      on
                        ? 'border-ink bg-ink text-canvas'
                        : 'border-linen text-clay hover:border-ink'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </FilterSection>

          <FilterSection label="Price">
            <div className="space-y-0.5">
              {PRICE_BUCKETS.map((b) => (
                <RadioRow
                  key={b.id}
                  checked={filters.price === b.id}
                  onClick={() => onChange({ ...filters, price: b.id })}
                >
                  {b.label}
                </RadioRow>
              ))}
            </div>
          </FilterSection>

          <FilterSection label="Sort">
            <div className="space-y-0.5">
              {SORTS.map((s) => (
                <RadioRow
                  key={s.id}
                  checked={sort === s.id}
                  onClick={() => onSortChange(s.id)}
                >
                  {s.label}
                </RadioRow>
              ))}
            </div>
          </FilterSection>
        </div>

        <div className="flex items-center gap-4 border-t border-linen px-6 py-5">
          {hasActive && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="eyebrow cursor-pointer text-clay transition-colors hover:text-ink"
            >
              Clear all
            </button>
          )}
          <Button onClick={onClose} variant="solid" className="ml-auto">
            View {resultCount} {resultCount === 1 ? 'result' : 'results'}
          </Button>
        </div>
      </div>
    </div>
  )
}
