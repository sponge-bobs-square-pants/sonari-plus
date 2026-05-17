import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProducts, deleteProduct } from '../../services/productApi'
import { categories } from '../../data/categories'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Placeholder from '../../components/ui/Placeholder'
import AdminPageShell from '../../components/admin/AdminPageShell'
import { formatPrice } from '../../utils/format'

const categoryName = (id) => categories.find((c) => c.id === id)?.name || id

// "All" plus the four real categories — the scoping tabs.
const TABS = [{ id: 'all', name: 'All' }, ...categories]

// The catalogue API is paginated; the admin list pulls a generous
// page and offers "Load more" rather than infinite scroll.
const ADMIN_PAGE_SIZE = 60
const SEARCH_DEBOUNCE = 350 // ms — wait for typing to settle before fetching

/* One product in the admin grid — the storefront card's look (uncropped
   natural-ratio image, slow hover zoom) on the dark admin theme, plus
   stock and Edit / Delete controls. The image and name link to the
   editor; the whole card is deliberately NOT one link, so Delete can be
   its own button. */
function AdminProductCard({ product, onDelete }) {
  const editTo = `/admin/products/${product._id}/edit`
  const cover =
    product.images?.[0] || product.colors?.[0]?.images?.[0] || null
  const zoom =
    'transition-transform duration-[900ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.05]'

  return (
    <li className="flex flex-col">
      <Link to={editTo} className="group block overflow-hidden bg-canvas/5">
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            className={`block w-full ${zoom}`}
          />
        ) : (
          <Placeholder
            tone="mid"
            mark={false}
            className={`aspect-[3/4] w-full ${zoom}`}
          />
        )}
      </Link>

      <div className="mt-3">
        <p className="eyebrow text-[0.5625rem] text-canvas/45">
          {categoryName(product.category)}
          {product.company ? ` · ${product.company}` : ''}
        </p>
        <h3 className="mt-1.5 truncate font-display text-base text-canvas">
          <Link to={editTo} className="transition-colors hover:text-canvas/65">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-canvas/55">
          from {formatPrice(product.priceFrom)}
        </p>
        <p className="mt-0.5 text-xs text-canvas/40">
          {product.totalStock} in stock
        </p>

        <div className="mt-3 flex gap-4 border-t border-canvas/12 pt-3">
          <Link
            to={editTo}
            className="eyebrow text-canvas/55 transition-colors hover:text-canvas"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(product._id, product.name)}
            className="eyebrow cursor-pointer text-canvas/55 transition-colors hover:text-dusk"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}

export default function AdminProductsPage() {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('') // raw input
  const [query, setQuery] = useState('') // debounced — what we actually fetch on

  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [moreError, setMoreError] = useState(false)

  const sentinelRef = useRef(null)
  // reqId tags every fetch: when the category/search changes mid-flight the
  // id moves on, so the stale response is recognised and dropped.
  const reqIdRef = useRef(0)
  const pageRef = useRef(1)
  const loadingMoreRef = useRef(false)

  // Debounce the search box — one fetch when typing pauses, not per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE)
    return () => clearTimeout(t)
  }, [search])

  // Memoised so it changes identity only when a real query input does.
  const fetchParams = useCallback(
    (pageNum) => ({
      page: pageNum,
      limit: ADMIN_PAGE_SIZE,
      category: category === 'all' ? undefined : category,
      search: query || undefined,
      sort: 'newest',
    }),
    [category, query],
  )

  // Page 1 — on mount and whenever the category or search changes.
  useEffect(() => {
    const id = ++reqIdRef.current
    pageRef.current = 1
    loadingMoreRef.current = false
    setStatus('loading')
    setError('')
    setMoreError(false)
    setProducts([])

    listProducts(fetchParams(1))
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
  }, [fetchParams])

  // Next page — append, don't replace.
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    setMoreError(false)
    const id = reqIdRef.current
    const next = pageRef.current + 1

    listProducts(fetchParams(next))
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
  }, [fetchParams])

  // Watch a sentinel below the grid; fetch the next page as it nears the
  // viewport. Rebuilt after each append (products.length dep) so it
  // re-checks intersection and keeps tall viewports filling.
  useEffect(() => {
    if (status !== 'ready' || !hasMore || moreError) return
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [status, hasMore, moreError, loadMore, products.length])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await deleteProduct(id)
      setProducts((list) => list.filter((p) => p._id !== id))
      setTotal((t) => Math.max(0, t - 1))
    } catch (err) {
      alert(err.message)
    }
  }

  // Empty-state copy depends on why nothing came back.
  const emptyMessage = query
    ? `Nothing matches “${query}”.`
    : category !== 'all'
      ? `No products in ${categoryName(category)} yet.`
      : 'Add your first piece to start building the catalogue.'

  return (
    <AdminPageShell backTo="/admin" backLabel="Dashboard" dark wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-dusk">Catalogue</p>
          <h1 className="mt-2 font-display text-4xl font-light tracking-tight text-canvas">
            Products
          </h1>
        </div>
        <Button as={Link} to="/admin/products/new" variant="light">
          Add product
        </Button>
      </div>

      {/* Category tabs */}
      <div className="mt-9 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = category === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setCategory(t.id)}
              className={`eyebrow cursor-pointer rounded-full border px-4 py-2 transition-colors ${
                active
                  ? 'border-canvas bg-canvas text-ink'
                  : 'border-canvas/20 text-canvas/55 hover:border-canvas/50 hover:text-canvas'
              }`}
            >
              {t.name}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="mt-5 flex max-w-xl items-center gap-3 border-b border-canvas/20 pb-2 transition-colors focus-within:border-canvas/60">
        <Icon name="search" className="h-[18px] w-[18px] shrink-0 text-canvas/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name"
          className="w-full bg-transparent text-sm text-canvas placeholder:text-canvas/35 focus:outline-none"
          aria-label="Search products by name"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="shrink-0 cursor-pointer text-canvas/40 transition-colors hover:text-canvas"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-8">
        {status === 'loading' && (
          <p className="text-sm text-canvas/55">Loading products…</p>
        )}

        {status === 'error' && <p className="text-sm text-dusk">{error}</p>}

        {status === 'ready' && total === 0 && (
          <div className="border-y border-canvas/15 py-20 text-center">
            <p className="font-display text-2xl font-light text-canvas">
              No products
            </p>
            <p className="mt-2 text-sm text-canvas/55">{emptyMessage}</p>
          </div>
        )}

        {status === 'ready' && total > 0 && (
          <>
            <p className="eyebrow mb-4 text-[0.5625rem] text-canvas/40">
              {total} {total === 1 ? 'product' : 'products'}
            </p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p) => (
                <AdminProductCard
                  key={p._id}
                  product={p}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </>
        )}

        {status === 'ready' && hasMore && (
          <div ref={sentinelRef} className="flex justify-center pt-10">
            {moreError ? (
              <button
                type="button"
                onClick={loadMore}
                className="eyebrow cursor-pointer text-dusk transition-colors hover:text-canvas"
              >
                Couldn’t load more — retry
              </button>
            ) : (
              <span className="eyebrow text-canvas/45">Loading more…</span>
            )}
          </div>
        )}
      </div>
    </AdminPageShell>
  )
}
