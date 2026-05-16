import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listProducts } from '../services/productApi'
import { categories } from '../data/categories'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import ProductCard from '../components/product/ProductCard'
import Reveal from '../components/ui/Reveal'
import Button from '../components/ui/Button'
import FilterModal, {
  PRICE_BUCKETS,
  EMPTY_FILTERS,
} from '../components/shop/FilterModal'

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  // Category comes from the URL (?category=…) — set by the menu /
  // category tiles. An unknown value resolves to null = show all.
  const activeCategory =
    categories.find((c) => c.id === searchParams.get('category')) || null

  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sort, setSort] = useState('newest')
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    listProducts()
      .then((all) => {
        setProducts(all)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [])

  // Filtered + sorted list — recomputed only when an input changes.
  const visible = useMemo(() => {
    const bucket = PRICE_BUCKETS.find((b) => b.id === filters.price)

    let list = products.filter((p) => {
      if (activeCategory && p.category !== activeCategory.id) return false
      if (filters.sizes.length) {
        const sizes = (p.colors || []).flatMap((c) =>
          c.sizes.map((s) => s.size),
        )
        if (!filters.sizes.some((s) => sizes.includes(s))) return false
      }
      if (bucket && (bucket.min != null || bucket.max != null)) {
        const price = p.priceFrom ?? 0
        if (bucket.min != null && price < bucket.min) return false
        if (bucket.max != null && price >= bucket.max) return false
      }
      return true
    })

    if (sort === 'price-asc') {
      list = [...list].sort((a, b) => (a.priceFrom ?? 0) - (b.priceFrom ?? 0))
    } else if (sort === 'price-desc') {
      list = [...list].sort((a, b) => (b.priceFrom ?? 0) - (a.priceFrom ?? 0))
    }
    return list
  }, [products, activeCategory, filters, sort])

  // Number of active filters — shown on the floating button.
  const activeCount = filters.sizes.length + (filters.price !== 'all' ? 1 : 0)

  return (
    <>
      <Header solid border={false} />

      <main className="min-h-screen bg-canvas px-6 pb-28 pt-24">
        <div className="mx-auto max-w-7xl">
          {status === 'loading' && (
            <p className="text-sm text-clay">Loading the collection…</p>
          )}

          {status === 'error' && <p className="text-sm text-dusk">{error}</p>}

          {/* No products in the catalogue at all */}
          {status === 'ready' && products.length === 0 && (
            <div className="border-y border-linen py-24 text-center">
              <p className="font-display text-2xl font-light text-ink">
                Nothing here yet
              </p>
              <p className="mt-2 text-sm text-clay">
                New pieces are on their way — check back soon.
              </p>
            </div>
          )}

          {/* Products exist, but filters/category exclude them all */}
          {status === 'ready' &&
            products.length > 0 &&
            visible.length === 0 && (
              <div className="border-y border-linen py-20 text-center">
                <p className="font-display text-2xl font-light text-ink">
                  No matches
                </p>
                <p className="mt-2 text-sm text-clay">
                  Nothing fits those filters — try clearing a few.
                </p>
                <Button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  variant="outline"
                  className="mt-8"
                >
                  Clear filters
                </Button>
              </div>
            )}

          {status === 'ready' && visible.length > 0 && (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((p, i) => (
                <Reveal key={p._id} delay={(i % 4) * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Sticky filter button — always visible while browsing */}
      <button
        type="button"
        onClick={() => setFilterOpen(true)}
        className="eyebrow fixed bottom-8 left-1/2 z-40 -translate-x-1/2 cursor-pointer rounded-full bg-ink px-7 py-4 text-canvas shadow-[0_16px_40px_-12px_rgba(46,42,38,0.5)] transition-colors hover:bg-clay"
      >
        Filter{activeCount > 0 ? ` · ${activeCount}` : ''}
      </button>

      <Footer />

      {filterOpen && (
        <FilterModal
          filters={filters}
          onChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          resultCount={visible.length}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </>
  )
}
