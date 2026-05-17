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

/** The signed-in user's paid orders, newest first. */
export const listOrders = () => api.get('/orders').then((d) => d.orders)
