import crypto from 'crypto'
import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import {
  razorpay,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
} from '../config/razorpay.js'

// Must mirror client/src/data/shipping.js — the server is the source of
// truth for money, so the client's totals are never trusted.
const FREE_DELIVERY_THRESHOLD = 2000
const DELIVERY_FEE = 120

// Days a customer has to request a return — from the Refund & Cancellation
// policy. The deadline is frozen onto each order the moment it's created.
const RETURN_WINDOW_DAYS = 10
const DAY_MS = 24 * 60 * 60 * 1000

const REQUIRED_ADDRESS_FIELDS = [
  'fullName',
  'phone',
  'line1',
  'city',
  'state',
  'pincode',
]

function cleanAddress(input = {}) {
  const address = {}
  for (const field of [...REQUIRED_ADDRESS_FIELDS, 'line2']) {
    address[field] =
      typeof input[field] === 'string' ? input[field].trim() : ''
  }
  return address
}

/**
 * Decrement variant stock for the items in a paid order. Best-effort and
 * per-item guarded — a single bad product never blocks the rest, and a
 * stock failure never fails the payment response (the order is already
 * paid; stock is reconcilable, money is not).
 */
async function reduceStockForOrder(order) {
  for (const item of order.items) {
    try {
      const product = await Product.findById(item.productId)
      if (!product) continue
      const color = product.colors.find((c) => c.name === item.color)
      const variant = color?.sizes.find((s) => s.size === item.size)
      if (!variant) continue
      variant.stock = Math.max(0, variant.stock - item.quantity)
      await product.save()
    } catch (err) {
      console.error(
        `[stock] could not reduce ${item.productId} ${item.color}/${item.size}:`,
        err.message,
      )
    }
  }
}

/**
 * POST /api/orders/create — create a pending Order from the user's cart
 * and a matching Razorpay order. Totals are computed here, server-side.
 */
export async function createOrder(req, res, next) {
  try {
    const address = cleanAddress(req.body.shippingAddress)
    const missing = REQUIRED_ADDRESS_FIELDS.filter((f) => !address[f])
    if (missing.length) {
      return res
        .status(400)
        .json({ message: `Missing address fields: ${missing.join(', ')}` })
    }

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' })
    }

    // Load every product in the cart once — used for both the stock
    // check and the cover image.
    const productIds = [...new Set(cart.items.map((i) => String(i.productId)))]
    const products = await Product.find({ _id: { $in: productIds } })
    const productById = {}
    for (const p of products) productById[String(p._id)] = p

    // Stock check — reject BEFORE creating the order or charging, so a
    // customer can never buy more than is available.
    for (const i of cart.items) {
      const product = productById[String(i.productId)]
      const variant = product?.colors
        .find((c) => c.name === i.color)
        ?.sizes.find((s) => s.size === i.size)
      const available = variant?.stock ?? 0
      if (available < i.quantity) {
        return res.status(400).json({
          message: `Only ${available} left of ${i.name} (${i.color} · ${i.size}). Please update your cart.`,
        })
      }
    }

    const items = cart.items.map((i) => {
      const product = productById[String(i.productId)]
      // current cover (the shop-grid photo); fall back to the cart
      // snapshot if the product has since been removed.
      const cover =
        product?.images?.[0] || product?.colors?.[0]?.images?.[0] || i.image
      return {
        productId: i.productId,
        name: i.name,
        company: i.company,
        image: cover,
        color: i.color,
        hex: i.hex,
        size: i.size,
        price: i.price,
        quantity: i.quantity,
      }
    })
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
    const total = subtotal + deliveryFee

    // Our order first — its id becomes the Razorpay receipt reference.
    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress: address,
      subtotal,
      deliveryFee,
      total,
      returnDeadline: new Date(Date.now() + RETURN_WINDOW_DAYS * DAY_MS),
    })

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // Razorpay works in paise
      currency: 'INR',
      receipt: order._id.toString(),
    })

    order.razorpayOrderId = rzpOrder.id
    await order.save()

    // Optionally save the address to the customer's profile.
    if (req.body.saveAddress) {
      const alreadySaved = req.user.addresses.some(
        (a) =>
          a.fullName === address.fullName &&
          a.line1 === address.line1 &&
          a.city === address.city &&
          a.pincode === address.pincode,
      )
      if (!alreadySaved) {
        req.user.addresses.push(address)
        await req.user.save()
      }
    }

    res.status(201).json({
      orderId: order._id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: RAZORPAY_KEY_ID,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/orders/verify — confirm Razorpay's payment signature. On a
 * valid signature the order is marked paid and the cart is emptied.
 */
export async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body

    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
    })
    if (!order) return res.status(404).json({ message: 'Order not found.' })

    // Already finalised — return it (handles a duplicate callback).
    if (order.paymentStatus === 'paid') return res.json({ order })

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      console.warn(
        `[verify] SIGNATURE MISMATCH — order ${order._id} flagged failed`,
      )
      order.paymentStatus = 'failed'
      await order.save()
      return res.status(400).json({ message: 'Payment verification failed.' })
    }

    order.paymentStatus = 'paid'
    order.razorpayPaymentId = razorpay_payment_id
    await order.save()
    console.log(
      `[verify] order ${order._id} confirmed paid · payment ${razorpay_payment_id}`,
    )

    // The paid items leave the cart, and their stock comes down.
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] })
    await reduceStockForOrder(order)

    res.json({ order })
  } catch (err) {
    next(err)
  }
}

/** GET /api/orders — the signed-in user's paid orders, newest first. */
export async function listMyOrders(req, res, next) {
  try {
    const orders = await Order.find({
      user: req.user._id,
      paymentStatus: 'paid',
    }).sort({ createdAt: -1 })
    res.json({ orders })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/orders/webhook — Razorpay's server-to-server callback.
 *
 * This is the RELIABLE confirmation path: even if the browser closes
 * before the verify call, Razorpay still notifies us here. There is no
 * session — it is authenticated by an HMAC signature over the RAW
 * request body (index.js stashes it on `req.rawBody`), so the route is
 * mounted ahead of the `protect` middleware.
 *
 * Idempotent: it shares the `paymentStatus !== 'paid'` guard with the
 * verify endpoint, so whichever arrives first wins and the other is a
 * harmless no-op.
 */
export async function razorpayWebhook(req, res) {
  try {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      return res
        .status(500)
        .json({ message: 'Webhook secret is not configured.' })
    }

    const signature = req.headers['x-razorpay-signature']
    const expected = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(req.rawBody || Buffer.from(''))
      .digest('hex')

    if (!signature || expected !== signature) {
      console.warn('[webhook] INVALID SIGNATURE — rejected (not from Razorpay)')
      return res.status(400).json({ message: 'Invalid webhook signature.' })
    }

    const { event, payload } = req.body
    console.log(`[webhook] verified call from Razorpay · event: ${event}`)
    const payment = payload?.payment?.entity

    if (payment?.order_id) {
      const order = await Order.findOne({ razorpayOrderId: payment.order_id })

      if (
        order &&
        event === 'payment.captured' &&
        order.paymentStatus !== 'paid'
      ) {
        order.paymentStatus = 'paid'
        order.razorpayPaymentId = payment.id
        await order.save()
        await Cart.findOneAndUpdate({ user: order.user }, { items: [] })
        await reduceStockForOrder(order)
        console.log(`[webhook] order ${order._id} marked paid`)
      } else if (
        order &&
        event === 'payment.failed' &&
        order.paymentStatus === 'created'
      ) {
        order.paymentStatus = 'failed'
        await order.save()
      }
    }

    res.json({ received: true })
  } catch (err) {
    // A 500 tells Razorpay to retry the webhook later.
    console.error('Razorpay webhook error:', err.message)
    res.status(500).json({ message: 'Webhook processing error.' })
  }
}
