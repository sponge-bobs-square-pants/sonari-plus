import { api } from './apiClient'

/* Order / checkout API calls — all require a session. */

/**
 * Create a pending order from the cart + a Razorpay order.
 * @param {object} shippingAddress
 * @param {boolean} saveAddress - also save the address to the user's profile
 * @returns {Promise<{ orderId, razorpayOrderId, amount, currency, keyId }>}
 */
export const createOrder = (shippingAddress, saveAddress = false) =>
  api.post('/orders/create', { shippingAddress, saveAddress })

/** Verify a completed Razorpay payment; resolves to the finalised order. */
export const verifyPayment = (payload) =>
  api.post('/orders/verify', payload).then((d) => d.order)

/**
 * Poll-style verify used by the PhonePe redirect flow: PhonePe can
 * redirect the browser back before the COMPLETED state has propagated,
 * so the response may be `{ status: 'pending', orderId }` (HTTP 202) —
 * the caller retries. On 200 it resolves to `{ order }` (paid); on 400+
 * the apiClient throws, which the caller treats as final failure.
 */
export const pollOrderVerify = (orderId) =>
  api.post('/orders/verify', { orderId })

/** The signed-in user's paid orders, newest first. */
export const listOrders = () => api.get('/orders').then((d) => d.orders)

/**
 * Admin: every order in the store, newest-first, paginated. Returns the
 * whole envelope — callers need `total` / `hasMore` for "Load more".
 * @param {object} params - { page, limit, paymentStatus, status, unseen,
 *   dateFrom, dateTo, search } — all optional filters.
 * @returns {Promise<{ orders, page, totalPages, total, hasMore }>}
 */
export const listAllOrders = (params = {}) => {
  const { page, limit, paymentStatus, status, unseen, dateFrom, dateTo, search } =
    params
  const qs = new URLSearchParams()
  if (page) qs.set('page', page)
  if (limit) qs.set('limit', limit)
  if (paymentStatus) qs.set('paymentStatus', paymentStatus)
  if (status) qs.set('status', status)
  if (unseen) qs.set('unseen', 'true')
  if (dateFrom) qs.set('dateFrom', dateFrom)
  if (dateTo) qs.set('dateTo', dateTo)
  if (search) qs.set('search', search)
  const q = qs.toString()
  return api.get(q ? `/orders/admin?${q}` : '/orders/admin')
}

/** Admin: mark an order as opened/seen. Resolves to the updated order. */
export const markOrderSeen = (id) =>
  api.post(`/orders/admin/${id}/seen`).then((d) => d.order)

/** Admin: run the Razorpay verify check on an order. Resolves to the order. */
export const verifyOrder = (id) =>
  api.post(`/orders/admin/${id}/verify`).then((d) => d.order)

/**
 * Admin: generate the Bill of Supply for a paid order — assigns a serial,
 * renders + hosts the PDF, and advances the order to `accepted`.
 * Resolves to the updated order.
 */
export const generateBill = (id) =>
  api.post(`/orders/admin/${id}/bill`).then((d) => d.order)

/** Admin: mark a dispatched order delivered (stamps the return deadline). */
export const markDelivered = (id) =>
  api.post(`/orders/admin/${id}/deliver`).then((d) => d.order)

/** Admin: mark a dispatched order's delivery as failed. */
export const markDeliveryFailed = (id) =>
  api.post(`/orders/admin/${id}/fail-delivery`).then((d) => d.order)

/**
 * Admin: manifest an order with Delhivery — creates the shipment + waybill
 * and moves it to 'manifested' (ready for pickup). `pkg` = { weight, length,
 * width, height }. Resolves to the updated order.
 */
export const manifestOrder = (id, pkg) =>
  api.post(`/orders/admin/${id}/manifest`, pkg).then((d) => d.order)

/** Admin: the orders ready for pickup (status 'manifested'), newest first. */
export const listManifested = () =>
  api.get('/orders/admin/manifested').then((d) => d.orders)

/**
 * Admin: schedule ONE Delhivery pickup that collects all the given
 * manifested orders. Resolves to `{ pickup, count }`.
 */
export const createBatchPickup = (orderIds, pickupDate, pickupTime) =>
  api.post('/orders/admin/pickup', { orderIds, pickupDate, pickupTime })

/** Admin: fetch the Delhivery shipping-label (packing slip) PDF URL. */
export const getOrderLabel = (id) =>
  api.get(`/orders/admin/${id}/label`).then((d) => d.url)

/**
 * Admin: the Bill-of-Supply register — orders with a bill, within an
 * optional issued-date range.
 * @param {object} params - { page, limit, from, to } (dates: YYYY-MM-DD)
 * @returns {Promise<{ bills, count, turnover, page, hasMore }>}
 */
export const listBills = ({ page, limit, from, to } = {}) => {
  const qs = new URLSearchParams()
  if (page) qs.set('page', page)
  if (limit) qs.set('limit', limit)
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  const q = qs.toString()
  return api.get(q ? `/orders/admin/bills?${q}` : '/orders/admin/bills')
}
