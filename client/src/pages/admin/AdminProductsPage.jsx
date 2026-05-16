import { useCallback, useEffect, useState } from 'react'
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

export default function AdminProductsPage() {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('') // raw input
  const [query, setQuery] = useState('') // debounced — what we actually fetch on

  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

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

  // Page 1: runs on mount and whenever the category or search changes.
  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    listProducts(fetchParams(1))
      .then((res) => {
        if (!active) return // a newer category/search superseded this
        setProducts(res.products)
        setPage(1)
        setTotal(res.total)
        setHasMore(res.hasMore)
        setStatus('ready')
      })
      .catch((err) => {
        if (!active) return
        setError(err.message)
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [fetchParams])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const res = await listProducts(fetchParams(next))
      setProducts((list) => [...list, ...res.products])
      setPage(next)
      setHasMore(res.hasMore)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

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
    <AdminPageShell backTo="/admin" backLabel="Dashboard" dark>
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
      <div className="mt-5 flex items-center gap-3 border-b border-canvas/20 pb-2 transition-colors focus-within:border-canvas/60">
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
            <ul className="divide-y divide-canvas/12 border-y border-canvas/12">
              {products.map((p) => (
                <li key={p._id} className="flex items-center gap-5 py-4">
                  <Placeholder
                    src={p.images?.[0]}
                    tone="mid"
                    mark={false}
                    className="h-20 w-16 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base text-canvas">
                      {p.name}
                    </h3>
                    <p className="eyebrow mt-1 text-[0.5625rem] text-canvas/45">
                      {categoryName(p.category)}
                      {p.company ? ` · ${p.company}` : ''}
                    </p>
                  </div>
                  <div className="hidden w-24 text-sm text-canvas/55 sm:block">
                    from {formatPrice(p.priceFrom)}
                  </div>
                  <div className="hidden w-28 text-sm text-canvas/55 sm:block">
                    {p.totalStock} in stock
                  </div>
                  <div className="flex gap-4">
                    <Link
                      to={`/admin/products/${p._id}/edit`}
                      className="eyebrow text-canvas/55 transition-colors hover:text-canvas"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p._id, p.name)}
                      className="eyebrow cursor-pointer text-canvas/55 transition-colors hover:text-dusk"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {status === 'ready' && hasMore && (
          <div className="mt-8 flex justify-center">
            <Button onClick={loadMore} variant="outline-light">
              {loadingMore ? 'Loading…' : 'Load more products'}
            </Button>
          </div>
        )}
      </div>
    </AdminPageShell>
  )
}
