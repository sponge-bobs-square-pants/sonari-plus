import { api } from './apiClient'

/* Product API calls. Single-product calls unwrap the envelope; the
   list call keeps it — callers need page / total for pagination. */

/**
 * GET /api/products — paginated list.
 *
 * @param {object} params - { page, limit, category, sizes (array),
 *   priceMin, priceMax, sort, tag, search } — all optional.
 * @returns {Promise<{ products, page, totalPages, total, hasMore }>}
 */
export const listProducts = (params = {}) => {
  const {
    page,
    limit,
    category,
    sizes,
    cups,
    priceMin,
    priceMax,
    sort,
    tag,
    search,
  } = params
  const qs = new URLSearchParams()
  if (page) qs.set('page', page)
  if (limit) qs.set('limit', limit)
  if (category) qs.set('category', category)
  if (sizes?.length) qs.set('sizes', sizes.join(','))
  if (cups?.length) qs.set('cups', cups.join(','))
  if (priceMin != null) qs.set('priceMin', priceMin)
  if (priceMax != null) qs.set('priceMax', priceMax)
  if (sort) qs.set('sort', sort)
  if (tag) qs.set('tag', tag)
  if (search) qs.set('search', search)
  const q = qs.toString()
  return api.get(q ? `/products?${q}` : '/products')
}

export const getProduct = (id) =>
  api.get(`/products/${id}`).then((d) => d.product)

export const createProduct = (data) =>
  api.post('/products', data).then((d) => d.product)

export const updateProduct = (id, data) =>
  api.put(`/products/${id}`, data).then((d) => d.product)

export const deleteProduct = (id) => api.del(`/products/${id}`)

/** Uploads an image file to Cloudinary (via the server), returns its URL. */
export const uploadImage = (file) => {
  const form = new FormData()
  form.append('image', file)
  return api.upload('/upload', form).then((d) => d.url)
}
