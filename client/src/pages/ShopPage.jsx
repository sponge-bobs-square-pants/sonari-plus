import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listProducts } from '../services/productApi'
import { categories, sizesForCategory } from '../data/categories'
import Header from '../components/layout/Header'
import ProductCard from '../components/product/ProductCard'
import Reveal from '../components/ui/Reveal'
import Button from '../components/ui/Button'
import FilterPanel, {
  PRICE_BUCKETS,
  EMPTY_FILTERS,
} from '../components/shop/FilterPanel'

// Products fetched per page. The server caps the limit it honours.
const PAGE_SIZE = 24

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  // Category comes from the URL (?category=…) — set by the menu /
  // category tiles. An unknown value resolves to null = show all.
  const activeCategory =
    categories.find((c) => c.id === searchParams.get('category')) || null
  const activeCategoryId = activeCategory?.id ?? null
  const isKids = activeCategoryId === 'kids'
  const sizeOptions = sizesForCategory(activeCategoryId)

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sort, setSort] = useState('newest')

  const [products, setProducts] = useState([]) // accumulated across pages
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [moreError, setMoreError] = useState(false)

  const sentinelRef = useRef(null)
  // reqId tags every fetch: when filters change mid-flight the id moves
  // on, so the stale response is recognised and dropped.
  const reqIdRef = useRef(0)
  const pageRef = useRef(1)
  const loadingMoreRef = useRef(false)

  const activeCount =
    filters.sizes.length +
    (filters.price !== 'all' ? 1 : 0) +
    (isKids && filters.gender !== 'all' ? 1 : 0)

  // Translate the UI state into the API's query params. Memoised so it
  // changes identity ONLY when a real query input changes — which is
  // exactly when the page-1 fetch below should re-run.
  const buildParams = useCallback(
    (page) => {
      const bucket = PRICE_BUCKETS.find((b) => b.id === filters.price)
      return {
        page,
        limit: PAGE_SIZE,
        category: activeCategoryId ?? undefined,
        sizes: filters.sizes,
        priceMin: bucket?.min,
        priceMax: bucket?.max,
        sort,
        // gender only applies while browsing the kids category
        gender:
          activeCategoryId === 'kids' && filters.gender !== 'all'
            ? filters.gender
            : undefined,
      }
    },
    [activeCategoryId, filters, sort],
  )

  // ── Page 1: runs on mount and whenever the query changes ──
  // Refetching from the server is the whole point — at tens of
  // thousands of products the client can't filter/sort locally.
  useEffect(() => {
    const id = ++reqIdRef.current
    pageRef.current = 1
    loadingMoreRef.current = false
    setStatus('loading')
    setError('')
    setMoreError(false)
    setProducts([])

    listProducts(buildParams(1))
      .then((res) => {
        if (id !== reqIdRef.current) return // a newer query superseded us
        setProducts(res.products)
        setTotal(res.total)
        setHasMore(res.hasMore)
        setStatus('ready')
      })
      .catch((err) => {
        if (id !== reqIdRef.current) return
        setError(err.message)
        setStatus('error')
      })
  }, [buildParams])

  // ── Next page: append, don't replace ──
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    setMoreError(false)
    const id = reqIdRef.current
    const next = pageRef.current + 1

    listProducts(buildParams(next))
      .then((res) => {
        if (id !== reqIdRef.current) return // query changed — drop the page
        pageRef.current = next
        setProducts((prev) => [...prev, ...res.products])
        setHasMore(res.hasMore)
      })
      .catch(() => {
        if (id === reqIdRef.current) setMoreError(true)
      })
      .finally(() => {
        if (id === reqIdRef.current) loadingMoreRef.current = false
      })
  }, [buildParams])

  // Watch a sentinel below the grid; when it nears the viewport, fetch
  // the next page. Rebuilt after each append (products.length dep) so
  // it re-checks intersection and keeps tall viewports filling.
  useEffect(() => {
    if (status !== 'ready' || !hasMore || moreError) return
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: '600px' }, // prefetch before the sentinel is on screen
    )
    io.observe(el)
    return () => io.disconnect()
  }, [status, hasMore, moreError, loadMore, products.length])

  return (
    <>
      <Header solid border={false} />

      <main className="min-h-screen bg-canvas px-6 pb-28 pt-24">
        <div className="mx-auto max-w-7xl">
          {status === 'loading' && (
            <p className="text-sm text-clay">Loading the collection…</p>
          )}

          {status === 'error' && <p className="text-sm text-dusk">{error}</p>}

          {/* Nothing came back for this query */}
          {status === 'ready' && total === 0 && (
            <div className="border-y border-linen py-24 text-center">
              <p className="font-display text-2xl font-light text-ink">
                {activeCount > 0 ? 'No matches' : 'Nothing here yet'}
              </p>
              <p className="mt-2 text-sm text-clay">
                {activeCount > 0
                  ? 'Nothing fits those filters — try clearing a few.'
                  : 'New pieces are on their way — check back soon.'}
              </p>
              {activeCount > 0 && (
                <Button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  variant="outline"
                  className="mt-8"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}

          {status === 'ready' && total > 0 && (
            <>
              <div className="grid grid-cols-2 justify-items-center gap-x-6 gap-y-14 md:grid-cols-3 md:gap-x-10 lg:grid-cols-4 lg:gap-x-12 lg:gap-y-16">
                {products.map((p, i) => (
                  <Reveal
                    key={p._id}
                    delay={(i % 4) * 80}
                    instantInView
                    className="w-full max-w-52"
                  >
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>

              {/* Sentinel — its arrival near the viewport loads the next page */}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center pt-16">
                  {moreError ? (
                    <button
                      type="button"
                      onClick={loadMore}
                      className="eyebrow cursor-pointer text-dusk transition-colors hover:text-ink"
                    >
                      Couldn’t load more — retry
                    </button>
                  ) : (
                    <span className="eyebrow text-clay">Loading more…</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Filter dock — a chat-widget panel pinned bottom-right */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        resultCount={total}
        activeCount={activeCount}
        sizeOptions={sizeOptions}
        showGender={isKids}
      />
    </>
  )
}
