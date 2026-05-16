import { api } from './apiClient'

/* Product API calls. Each unwraps the server's response envelope
   so callers get the bare product / list. */

export const listProducts = (category) =>
  api
    .get(category ? `/products?category=${category}` : '/products')
    .then((d) => d.products)

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
