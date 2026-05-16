import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProducts, deleteProduct } from '../../services/productApi'
import { categories } from '../../data/categories'
import Button from '../../components/ui/Button'
import Placeholder from '../../components/ui/Placeholder'
import AdminPageShell from '../../components/admin/AdminPageShell'
import { formatPrice } from '../../utils/format'

const categoryName = (id) => categories.find((c) => c.id === id)?.name || id

export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  const load = async () => {
    setStatus('loading')
    try {
      setProducts(await listProducts())
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await deleteProduct(id)
      setProducts((list) => list.filter((p) => p._id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

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

      <div className="mt-10">
        {status === 'loading' && (
          <p className="text-sm text-canvas/55">Loading products…</p>
        )}

        {status === 'error' && <p className="text-sm text-dusk">{error}</p>}

        {status === 'ready' && products.length === 0 && (
          <div className="border-y border-canvas/15 py-20 text-center">
            <p className="font-display text-2xl font-light text-canvas">
              No products yet
            </p>
            <p className="mt-2 text-sm text-canvas/55">
              Add your first piece to start building the catalogue.
            </p>
          </div>
        )}

        {status === 'ready' && products.length > 0 && (
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
        )}
      </div>
    </AdminPageShell>
  )
}
