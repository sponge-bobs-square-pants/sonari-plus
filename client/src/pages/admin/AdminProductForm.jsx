import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getProduct,
  createProduct,
  updateProduct,
} from '../../services/productApi'
import { categories, sizesForCategory } from '../../data/categories'
import { BRAND } from '../../data/brand'
import TextField from '../../components/ui/TextField'
import Button from '../../components/ui/Button'
import AdminPageShell from '../../components/admin/AdminPageShell'
import ImageManager from '../../components/admin/ImageManager'
import SingleImageField from '../../components/admin/SingleImageField'

const EMPTY = {
  name: '',
  company: '',
  description: '',
  category: 'nightwear',
  fabric: '',
  gender: '', // only used by the `kids` category
  tag: '',
  colors: [], // [{ name, hex, sizes: [{ size, price, stock }], images: [] }]
  images: [],
  featuredImage: '', // dedicated "Just arrived" cover
}

// Shared classes for the dark-theme textarea / select.
const fieldClass =
  'mt-2 w-full border-b border-canvas/25 bg-transparent pb-2 text-sm text-canvas ' +
  'transition-colors focus:border-canvas focus:outline-none'

const fieldLabel = 'eyebrow text-[0.625rem] text-canvas/50'
const variantInput =
  'h-9 w-20 border-b border-canvas/25 bg-transparent text-sm text-canvas ' +
  'focus:border-canvas focus:outline-none'

/* ── One colour variant: name, swatch, sized/priced rows, images ──
   `sizeOptions` is the size set for the product's category. */
function ColorBlock({ color, index, sizeOptions, onChange, onRemove }) {
  const sizeEntry = (size) => color.sizes.find((s) => s.size === size)

  const toggleSize = (size) => {
    const next = sizeEntry(size)
      ? color.sizes.filter((s) => s.size !== size)
      : [...color.sizes, { size, price: 0, stock: 0 }]
    onChange(index, { ...color, sizes: next })
  }

  const setSizeField = (size, field, value) => {
    onChange(index, {
      ...color,
      sizes: color.sizes.map((s) =>
        s.size === size ? { ...s, [field]: Number(value) || 0 } : s,
      ),
    })
  }

  const subtotal = color.sizes.reduce(
    (sum, s) => sum + (Number(s.stock) || 0),
    0,
  )

  return (
    <div className="border border-canvas/15 p-5">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={color.hex}
          onChange={(e) => onChange(index, { ...color, hex: e.target.value })}
          className="h-9 w-9 shrink-0 cursor-pointer border border-canvas/25 bg-transparent"
          aria-label="Colour swatch"
        />
        <input
          type="text"
          value={color.name}
          onChange={(e) => onChange(index, { ...color, name: e.target.value })}
          placeholder="Colour name (e.g. Ivory)"
          className="h-10 flex-1 border-b border-canvas/25 bg-transparent text-sm text-canvas placeholder:text-canvas/35 focus:border-canvas focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="eyebrow cursor-pointer text-canvas/55 transition-colors hover:text-dusk"
        >
          Remove
        </button>
      </div>

      <div className="mt-4">
        <span className="eyebrow text-[0.5625rem] text-canvas/40">
          Sizes · price · stock
        </span>
        <div className="mt-2 space-y-2">
          {sizeOptions.map((size) => {
            const entry = sizeEntry(size)
            const on = Boolean(entry)
            return (
              <div key={size} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`h-9 w-12 shrink-0 cursor-pointer border text-xs transition-colors ${
                    on
                      ? 'border-canvas bg-canvas text-ink'
                      : 'border-canvas/25 text-canvas/60 hover:border-canvas'
                  }`}
                >
                  {size}
                </button>
                {on && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-canvas/40">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.price}
                        onChange={(e) =>
                          setSizeField(size, 'price', e.target.value)
                        }
                        className={variantInput}
                      />
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={entry.stock}
                      onChange={(e) =>
                        setSizeField(size, 'stock', e.target.value)
                      }
                      className={variantInput}
                    />
                    <span className="text-xs text-canvas/40">in stock</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-canvas/45">
          {subtotal} in stock for this colour
        </p>
      </div>

      <div className="mt-5">
        <span className="eyebrow text-[0.5625rem] text-canvas/40">
          Images for this colour (optional)
        </span>
        <p className="mt-1 text-xs text-canvas/40">
          Leave empty to use the main product images.
        </p>
        <div className="mt-2">
          <ImageManager
            images={color.images || []}
            onChange={(imgs) => onChange(index, { ...color, images: imgs })}
          />
        </div>
      </div>
    </div>
  )
}

export default function AdminProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // In edit mode, load the existing product into the form.
  useEffect(() => {
    if (!isEdit) return
    getProduct(id)
      .then((p) => {
        setForm({
          name: p.name,
          company: p.company || '',
          description: p.description || '',
          category: p.category,
          fabric: p.fabric || '',
          gender: p.gender || '',
          tag: p.tag || '',
          colors: p.colors || [],
          images: p.images || [],
          featuredImage: p.featuredImage || '',
        })
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id, isEdit])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const update = (e) => set(e.target.name, e.target.value)

  // Size set follows the chosen category (apparel XS–XL vs kids 8–16).
  const sizeOptions = sizesForCategory(form.category)

  /* ── Colours (each owns its variants and images) ── */
  const addColor = () =>
    set('colors', [
      ...form.colors,
      { name: '', hex: '#cccccc', sizes: [], images: [] },
    ])
  const setColorAt = (index, nextColor) =>
    set(
      'colors',
      form.colors.map((c, i) => (i === index ? nextColor : c)),
    )
  const removeColor = (index) =>
    set('colors', form.colors.filter((_, i) => i !== index))

  const totalStock = form.colors.reduce(
    (total, c) =>
      total + c.sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0),
    0,
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        // gender is a kids-only attribute
        gender: form.category === 'kids' ? form.gender : '',
        // drop blank colour rows; keep each colour's sizes in size order
        colors: form.colors
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name,
            hex: c.hex,
            images: c.images || [],
            sizes: [...c.sizes]
              .map((s) => ({
                size: s.size,
                price: Number(s.price) || 0,
                stock: Number(s.stock) || 0,
              }))
              .sort(
                (a, b) =>
                  sizeOptions.indexOf(a.size) - sizeOptions.indexOf(b.size),
              ),
          })),
      }
      if (isEdit) await updateProduct(id, payload)
      else await createProduct(payload)
      navigate('/admin/products')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminPageShell backTo="/admin/products" backLabel="Products" dark>
        <p className="text-sm text-canvas/55">Loading…</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell backTo="/admin/products" backLabel="Products" dark>
      <p className="eyebrow text-dusk">{isEdit ? 'Edit' : 'New'}</p>
      <h1 className="mt-2 font-display text-4xl font-light tracking-tight text-canvas">
        {isEdit ? 'Edit product' : 'Add product'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-10 max-w-2xl space-y-7">
        <div className="grid gap-7 sm:grid-cols-2">
          <TextField
            label="Name"
            name="name"
            value={form.name}
            onChange={update}
            required
            dark
          />
          <TextField
            label="Company"
            name="company"
            value={form.company}
            onChange={update}
            required
            placeholder={`e.g. ${BRAND.name}, or a partner brand`}
            dark
          />
        </div>

        <label className="block">
          <span className={fieldLabel}>Description</span>
          <textarea
            name="description"
            value={form.description}
            onChange={update}
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </label>

        <div className="grid gap-7 sm:grid-cols-2">
          <label className="block">
            <span className={fieldLabel}>Category</span>
            <select
              name="category"
              value={form.category}
              onChange={update}
              className={fieldClass}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-ink text-canvas">
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={fieldLabel}>Tag</span>
            <select
              name="tag"
              value={form.tag}
              onChange={update}
              className={fieldClass}
            >
              <option value="" className="bg-ink text-canvas">
                None
              </option>
              <option value="New" className="bg-ink text-canvas">
                New
              </option>
              <option value="Bestseller" className="bg-ink text-canvas">
                Bestseller
              </option>
            </select>
          </label>
        </div>

        {/* Gender — kids only */}
        {form.category === 'kids' && (
          <label className="block">
            <span className={fieldLabel}>For</span>
            <select
              name="gender"
              value={form.gender}
              onChange={update}
              className={fieldClass}
            >
              <option value="" className="bg-ink text-canvas">
                Select…
              </option>
              <option value="boy" className="bg-ink text-canvas">
                Boys
              </option>
              <option value="girl" className="bg-ink text-canvas">
                Girls
              </option>
            </select>
          </label>
        )}

        <TextField
          label="Fabric"
          name="fabric"
          value={form.fabric}
          onChange={update}
          placeholder="e.g. TENCEL™ modal"
          dark
        />

        {/* Product images */}
        <div>
          <span className={fieldLabel}>Product images</span>
          <p className="mt-1 text-xs text-canvas/40">
            The first image is the cover. Reorder with ‹ ›.
          </p>
          <div className="mt-3">
            <ImageManager
              images={form.images}
              onChange={(imgs) => set('images', imgs)}
            />
          </div>
        </div>

        {/* "Just arrived" cover — only shown for New-tagged products */}
        {form.tag === 'New' && (
          <div>
            <span className={fieldLabel}>&ldquo;Just arrived&rdquo; cover</span>
            <p className="mt-1 text-xs text-canvas/40">
              Shown only in the homepage &ldquo;New this week&rdquo; section.
              Leave empty to use the main cover.
            </p>
            <div className="mt-3">
              <SingleImageField
                value={form.featuredImage}
                onChange={(url) => set('featuredImage', url)}
              />
            </div>
          </div>
        )}

        {/* Colours → sizes → price & stock → images */}
        <div>
          <span className={fieldLabel}>Colours, sizes, price &amp; stock</span>
          <p className="mt-1 text-xs text-canvas/40">
            Add each colour, then the sizes it comes in — each size has its own
            price and stock.
          </p>

          <div className="mt-3 space-y-3">
            {form.colors.map((c, i) => (
              <ColorBlock
                key={i}
                color={c}
                index={i}
                sizeOptions={sizeOptions}
                onChange={setColorAt}
                onRemove={removeColor}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addColor}
            className="eyebrow mt-3 inline-flex items-center gap-2 text-canvas/70 transition-colors hover:text-canvas"
          >
            <span className="text-base leading-none">+</span> Add colour
          </button>

          <p className="mt-4 text-sm text-canvas/55">
            Total stock: <span className="text-canvas">{totalStock}</span>
          </p>
        </div>

        {error && <p className="text-xs text-dusk">{error}</p>}

        <div className="flex gap-4 pt-2">
          <Button type="submit" variant="light" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </Button>
          <Button as={Link} to="/admin/products" variant="outline-light">
            Cancel
          </Button>
        </div>
      </form>
    </AdminPageShell>
  )
}
