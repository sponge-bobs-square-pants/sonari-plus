import { api } from './apiClient'

/* Cart API calls — all require a session (the server's `protect`
   middleware). Each unwraps the `{ items }` envelope. */

/** The signed-in user's stored cart. */
export const fetchCart = () => api.get('/cart').then((d) => d.items)

/** Replace the stored cart wholesale with `items`. */
export const saveCart = (items) =>
  api.put('/cart', { items }).then((d) => d.items)

/** Fold `items` (a guest cart) into the stored cart; returns the result. */
export const mergeCart = (items) =>
  api.post('/cart/merge', { items }).then((d) => d.items)
