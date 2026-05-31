import { Fragment, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getProduct,
  createProduct,
  updateProduct,
} from '../../services/productApi'
import {
  categories,
  sizesForCategory,
  cupsForCategory,
} from '../../data/categories'
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
   `sizeOptions` is the category's size set (the band list for bras).
   `cupOptions` is the cup list for bras, or null for every other category —
   its presence switches the variant editor to a band × cup grid. */
function ColorBlock({ color, index, sizeOptions, cupOptions, onChange, onRemove }) {
  const bras = Boolean(cupOptions)

  // A variant is identified by (size, cup). cup is '' for non-bra categories.
  const variantAt = (size, cup = '') =>
    color.sizes.find((s) => s.size === size && (s.cup || '') === cup)

  const toggleVariant = (size, cup = '') => {
    const next = variantAt(size, cup)
      ? color.sizes.filter((s) => !(s.size === size && (s.cup || '') === cup))
      : [
          ...color.sizes,
          { size, cup, price: 0, discountedPrice: null, stock: 0 },
        ]
    onChange(index, { ...color, sizes: next })
  }

  // The discountedPrice input is a plain text box, so an empty value should
  // reset it to null (= "no discount") — only positive numbers count.
  const setVariantField = (size, cup, field, value) => {
    const numeric =
      field === 'discountedPrice'
        ? value === '' || Number(value) <= 0
          ? null
          : Number(value)
        : Number(value) || 0
    onChange(index, {
      ...color,
      sizes: color.sizes.map((s) =>
        s.size === size && (s.cup || '') === cup
          ? { ...s, [field]: numeric }
          : s,
      ),
    })
  }

  // Bulk-apply: take the lowest non-zero price across this colour's
  // stocked variants and a fixed discounted price, and stamp the discount
  // on every variant. Cheaper UX than per-variant entry for the common
  // case (whole-colour sale).
  const applyBulkDiscount = () => {
    const stocked = color.sizes
    if (stocked.length === 0) return
    const ans = window.prompt(
      'Discounted price (₹) to apply to every size in this colour. Empty or 0 clears the discount.',
      '',
    )
    if (ans === null) return // cancelled
    const dp = Number(ans)
    const next = dp > 0 ? dp : null
    onChange(index, {
      ...color,
      sizes: color.sizes.map((s) => ({ ...s, discountedPrice: next })),
    })
  }

  const subtotal = color.sizes.reduce(
    (sum, s) => sum + (Number(s.stock) || 0),
    0,
  )

  // Selected variants, ordered band-then-cup, for the price/stock list.
  const sorted = [...color.sizes].sort(
    (a, b) =>
      sizeOptions.indexOf(a.size) - sizeOptions.indexOf(b.size) ||
      (bras
        ? cupOptions.indexOf(a.cup || '') - cupOptions.indexOf(b.cup || '')
        : 0),
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
          {bras ? 'Band × cup — tap to stock' : 'Sizes · price · stock'}
        </span>

        {bras ? (
          <>
            {/* band (rows) × cup (columns) toggle grid */}
            <div className="mt-2 overflow-x-auto">
              <div
                className="inline-grid gap-1"
                style={{
                  gridTemplateColumns: `2rem repeat(${cupOptions.length}, 1.9rem)`,
                }}
              >
                <span />
                {cupOptions.map((cup) => (
                  <span
                    key={cup}
                    className="pb-1 text-center text-[0.625rem] text-canvas/40"
                  >
                    {cup}
                  </span>
                ))}
                {sizeOptions.map((band) => (
                  <Fragment key={band}>
                    <span className="self-center pr-1 text-right text-[0.6875rem] text-canvas/50">
                      {band}
                    </span>
                    {cupOptions.map((cup) => {
                      const on = Boolean(variantAt(band, cup))
                      return (
                        <button
                          key={cup}
                          type="button"
                          aria-label={`${band}${cup}`}
                          onClick={() => toggleVariant(band, cup)}
                          className={`flex h-[1.9rem] w-[1.9rem] cursor-pointer items-center justify-center border text-[0.625rem] transition-colors ${
                            on
                              ? 'border-canvas bg-canvas text-ink'
                              : 'border-canvas/20 text-canvas/40 hover:border-canvas/60'
                          }`}
                        >
                          {on ? '●' : ''}
                        </button>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>

            {/* price + discount + stock for each stocked band+cup */}
            {sorted.length > 0 && (
              <div className="mt-4 space-y-2">
                {sorted.map((s) => (
                  <div
                    key={`${s.size}-${s.cup}`}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <span className="w-10 shrink-0 text-xs text-canvas">
                      {s.size}
                      {s.cup}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-canvas/40">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={s.price}
                        onChange={(e) =>
                          setVariantField(s.size, s.cup || '', 'price', e.target.value)
                        }
                        className={variantInput}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="eyebrow text-[0.5625rem] text-dusk">
                        Sale ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={s.discountedPrice ?? ''}
                        placeholder="—"
                        onChange={(e) =>
                          setVariantField(
                            s.size,
                            s.cup || '',
                            'discountedPrice',
                            e.target.value,
                          )
                        }
                        className={variantInput}
                      />
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={s.stock}
                      onChange={(e) =>
                        setVariantField(s.size, s.cup || '', 'stock', e.target.value)
                      }
                      className={variantInput}
                    />
                    <span className="text-xs text-canvas/40">in stock</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={applyBulkDiscount}
                  className="eyebrow text-[0.5625rem] text-dusk transition-colors hover:text-canvas"
                >
                  Apply sale price to all →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 space-y-2">
            {sizeOptions.map((size) => {
              const entry = variantAt(size)
              const on = Boolean(entry)
              return (
                <div
                  key={size}
                  className="flex flex-wrap items-center gap-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleVariant(size)}
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
                            setVariantField(size, '', 'price', e.target.value)
                          }
                          className={variantInput}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="eyebrow text-[0.5625rem] text-dusk">
                          Sale ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={entry.discountedPrice ?? ''}
                          placeholder="—"
                          onChange={(e) =>
                            setVariantField(
                              size,
                              '',
                              'discountedPrice',
                              e.target.value,
                            )
                          }
                          className={variantInput}
                        />
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={entry.stock}
                        onChange={(e) =>
                          setVariantField(size, '', 'stock', e.target.value)
                        }
                        className={variantInput}
                      />
                      <span className="text-xs text-canvas/40">in stock</span>
                    </>
                  )}
                </div>
              )
            })}
            {color.sizes.length > 0 && (
              <button
                type="button"
                onClick={applyBulkDiscount}
                className="eyebrow text-[0.5625rem] text-dusk transition-colors hover:text-canvas"
              >
                Apply sale price to all →
              </button>
            )}
          </div>
        )}

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

  // Size set follows the chosen category (apparel XS–XL vs kids 8–16, or
  // the band list for bras). `cupOptions` is non-null only for bras.
  const sizeOptions = sizesForCategory(form.category)
  const cupOptions = cupsForCategory(form.category)

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
              .map((s) => {
                const price = Number(s.price) || 0
                // Only persist a real, active discount (>0 and < MRP).
                // Otherwise null — the schema treats null as "no discount".
                const dp = Number(s.discountedPrice)
                const discountedPrice =
                  Number.isFinite(dp) && dp > 0 && dp < price ? dp : null
                return {
                  size: s.size,
                  cup: s.cup || '', // '' for non-bras
                  price,
                  discountedPrice,
                  stock: Number(s.stock) || 0,
                }
              })
              .sort(
                (a, b) =>
                  sizeOptions.indexOf(a.size) - sizeOptions.indexOf(b.size) ||
                  (cupOptions
                    ? cupOptions.indexOf(a.cup) - cupOptions.indexOf(b.cup)
                    : 0),
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
                cupOptions={cupOptions}
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
