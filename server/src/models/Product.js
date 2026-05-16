import mongoose from 'mongoose'

/** Fixed storefront categories — products reference one of these ids. */
export const CATEGORIES = ['nightwear', 'nightdresses', 'bras', 'panties']

/**
 * One variant: a size within a colour, with its own price and stock.
 * Price and stock both live here because they can differ across the
 * colour × size grid.
 */
const variantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    stock: { type: Number, default: 0, min: [0, 'Stock cannot be negative'] },
  },
  { _id: false },
)

/** A colour variant — its own sizes, and optionally its own images. */
const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: { type: String, default: '#cccccc', trim: true },
    sizes: { type: [variantSchema], default: [] },
    // Optional, ordered. Empty → the storefront falls back to the
    // product-level images.
    images: { type: [String], default: [] },
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [120, 'Name is too long'],
    },
    // The brand / company this product comes from — the store
    // stocks pieces from several different companies.
    company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true,
      maxlength: [120, 'Company name is too long'],
    },
    description: { type: String, default: '', trim: true },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: CATEGORIES, message: '{VALUE} is not a valid category' },
    },
    fabric: { type: String, default: '', trim: true },
    // colour → sizes → { price, stock }. The whole variant tree.
    colors: { type: [colorSchema], default: [] },
    images: { type: [String], default: [] }, // Cloudinary secure URLs
    // A dedicated cover for the homepage "New this week" section.
    // Empty → that section falls back to images[0].
    featuredImage: { type: String, default: '' },
    tag: {
      type: String,
      enum: ['', 'New', 'Bestseller'],
      default: '',
    },
  },
  { timestamps: true },
)

/** Every variant flattened into one list — basis for the virtuals. */
function allVariants(product) {
  return product.colors.flatMap((c) => c.sizes)
}

// Total stock — aggregated across every colour × size variant.
productSchema.virtual('totalStock').get(function () {
  return allVariants(this).reduce((sum, v) => sum + (v.stock || 0), 0)
})

// Headline price — the cheapest variant ("from £X" on the storefront).
productSchema.virtual('priceFrom').get(function () {
  const prices = allVariants(this).map((v) => v.price)
  return prices.length ? Math.min(...prices) : 0
})

// Include virtuals in API responses; drop the internal version key.
productSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Product', productSchema)
