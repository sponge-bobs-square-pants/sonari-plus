import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import Icon from '../ui/Icon'

// "For" options — the section is shown only for the kids category.
const GENDERS = [
  { id: 'all', label: 'Everyone' },
  { id: 'boy', label: 'Boys' },
  { id: 'girl', label: 'Girls' },
]

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
// `gender` only applies to the kids category.
export const EMPTY_FILTERS = { sizes: [], price: 'all', gender: 'all' }

function FilterSection({ label, children }) {
  return (
    <div className="border-t border-linen py-5 first:border-t-0 first:pt-1">
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
 * Filter & sort — a chat-widget-style dock pinned to the centre-bottom
 * of the shop page. The pill launcher stays put; tapping it expands a
 * panel directly above it. Unlike a modal it has NO backdrop and does
 * NOT lock page scroll — the grid stays visible and live as you filter.
 * Closes on Escape, a click outside the dock, the × or "View results".
 */
export default function FilterPanel({
  filters,
  onChange,
  sort,
  onSortChange,
  resultCount,
  activeCount,
  sizeOptions = [],
  showGender = false,
}) {
  const [open, setOpen] = useState(false)
  const dockRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (e) => {
      if (dockRef.current && !dockRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const toggleSize = (size) =>
    onChange({
      ...filters,
      sizes: filters.sizes.includes(size)
        ? filters.sizes.filter((s) => s !== size)
        : [...filters.sizes, size],
    })

  const hasActive =
    filters.sizes.length > 0 ||
    filters.price !== 'all' ||
    filters.gender !== 'all'

  return (
    <div
      ref={dockRef}
      className="fixed bottom-8 right-8 z-40 flex w-[21rem] max-w-[calc(100vw-4rem)] flex-col items-stretch"
    >
      {/* Panel — grows upward out of the launcher */}
      {open && (
        <div className="animate-fade-up mb-2.5 flex max-h-[70vh] flex-col overflow-hidden rounded-[1.75rem] bg-canvas shadow-[0_26px_60px_-18px_rgba(46,42,38,0.5)] ring-1 ring-linen">
          <div className="flex items-center justify-between px-6 pb-3 pt-5">
            <p className="eyebrow text-ink">Filter &amp; sort</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="cursor-pointer text-clay transition-colors hover:text-ink"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            {showGender && (
              <FilterSection label="For">
                <div className="space-y-0.5">
                  {GENDERS.map((g) => (
                    <RadioRow
                      key={g.id}
                      checked={filters.gender === g.id}
                      onClick={() => onChange({ ...filters, gender: g.id })}
                    >
                      {g.label}
                    </RadioRow>
                  ))}
                </div>
              </FilterSection>
            )}

            <FilterSection label="Size">
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((s) => {
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

          <div className="flex items-center gap-4 border-t border-linen px-6 py-4">
            {hasActive && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="eyebrow cursor-pointer text-clay transition-colors hover:text-ink"
              >
                Clear all
              </button>
            )}
            <Button
              onClick={() => setOpen(false)}
              variant="solid"
              className="ml-auto"
            >
              View {resultCount} {resultCount === 1 ? 'result' : 'results'}
            </Button>
          </div>
        </div>
      )}

      {/* Launcher — pinned round button that toggles the panel */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close filters' : 'Filter'}
        className="relative cursor-pointer self-end rounded-full bg-ink p-4 text-canvas shadow-[0_16px_40px_-12px_rgba(46,42,38,0.5)] transition-colors hover:bg-clay"
      >
        <Icon name={open ? 'close' : 'filter'} className="h-6 w-6" />
        {!open && activeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-dusk px-1 text-[0.65rem] font-medium text-canvas">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  )
}
