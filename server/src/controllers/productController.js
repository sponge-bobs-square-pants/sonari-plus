import Product from '../models/Product.js'

/** GET /api/products — public list, newest first, optional ?category= filter. */
export async function listProducts(req, res, next) {
  try {
    const filter = {}
    if (req.query.category) filter.category = req.query.category
    const products = await Product.find(filter).sort('-createdAt')
    res.json({ products })
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
