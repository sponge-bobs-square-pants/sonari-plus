import Product from '../models/Product.js'

// Sort keys the storefront may ask for → Mongo sort specs. The `_id`
// tiebreaker makes paging stable when many docs share a sort value.
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  'price-asc': { priceFrom: 1, _id: 1 },
  'price-desc': { priceFrom: -1, _id: -1 },
}

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 60

/**
 * GET /api/products — public, paginated list.
 *
 * Query params (all optional):
 *   page, limit               — pagination
 *   category, tag             — exact-match filters
 *   sizes                     — CSV; matches a product with ANY of these sizes
 *   priceMin, priceMax        — range on the denormalised priceFrom
 *   sort                      — newest | price-asc | price-desc
 *
 * Responds with { products, page, totalPages, total, hasMore } so the
 * client can drive infinite scroll without guessing when to stop.
 */
export async function listProducts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT),
    )

    const query = {}
    if (req.query.category) query.category = req.query.category
    if (req.query.tag) query.tag = req.query.tag
    if (req.query.gender) query.gender = req.query.gender // kids: boy | girl

    // Name search (admin) — case-insensitive substring. User input is
    // regex-escaped so characters like ( ) . * can't break the query.
    if (req.query.search) {
      const term = req.query.search.trim()
      if (term) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        query.name = { $regex: escaped, $options: 'i' }
      }
    }

    if (req.query.sizes) {
      const sizes = req.query.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (sizes.length) query['colors.sizes.size'] = { $in: sizes }
    }

    const priceMin = Number(req.query.priceMin)
    const priceMax = Number(req.query.priceMax)
    if (Number.isFinite(priceMin)) {
      query.priceFrom = { ...query.priceFrom, $gte: priceMin }
    }
    if (Number.isFinite(priceMax)) {
      query.priceFrom = { ...query.priceFrom, $lt: priceMax }
    }

    const sort = SORTS[req.query.sort] || SORTS.newest

    // Run the page fetch and the total count together.
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(query),
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))
    res.json({
      products,
      page,
      totalPages,
      total,
      hasMore: page < totalPages,
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/products/:id — public, single product. */
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ product })
  } catch (err) {
    next(err)
  }
}

/** POST /api/products — admin only. */
export async function createProduct(req, res, next) {
  try {
    const product = await Product.create(req.body)
    res.status(201).json({ product })
  } catch (err) {
    next(err)
  }
}

/** PUT /api/products/:id — admin only. */
export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // return the updated document
      runValidators: true, // re-check schema rules on update
    })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ product })
  } catch (err) {
    next(err)
  }
}

/** DELETE /api/products/:id — admin only. */
export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ message: 'Product deleted' })
  } catch (err) {
    next(err)
  }
}
