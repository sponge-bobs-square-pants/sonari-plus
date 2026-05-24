import crypto from 'crypto'
import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import Counter from '../models/Counter.js'
import cloudinary from '../config/cloudinary.js'
import {
  razorpay,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
} from '../config/razorpay.js'
import { financialYear, buildBillOfSupplyPdf } from '../utils/billOfSupply.js'
import {
  createShipment,
  schedulePickup,
  getPackingSlip,
} from '../services/delhivery.js'
import { DELHIVERY } from '../config/delhivery.js'

// Must mirror client/src/data/shipping.js — the server is the source of
// truth for money, so the client's totals are never trusted.
const FREE_DELIVERY_THRESHOLD = 2000
const DELIVERY_FEE = 120

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
    // (`returnDeadline` is NOT set here — the return window starts on
    // delivery, so it's stamped when the order is marked delivered.)
    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress: address,
      subtotal,
      deliveryFee,
      total,
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
 * GET /api/orders/admin — every order in the store, newest first, for the
 * admin panel. Paginated; each order's customer name/email is joined in.
 * Unlike the customer list this returns ALL paymentStatuses (paid, pending
 * and failed) — the admin needs the full picture.
 *
 * Optional filters: `paymentStatus`, `status` (fulfilment), `unseen=true`
 * (orders the admin hasn't opened), and a `dateFrom`/`dateTo` window.
 */
export async function listAllOrders(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 30))
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus
    if (req.query.status) filter.status = req.query.status
    if (req.query.unseen === 'true') filter.seenByAdmin = false
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {}
      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(req.query.dateFrom)
      }
      if (req.query.dateTo) {
        const to = new Date(req.query.dateTo)
        to.setHours(23, 59, 59, 999) // include the whole end day
        filter.createdAt.$lte = to
      }
    }
    if (req.query.search) {
      // Customers quote the short code shown in the UI — the last 8 hex
      // chars of the _id. Strip anything non-hex (a leading '#', spaces)
      // and match it as a substring of the stringified _id, case-insensitive.
      const term = req.query.search.replace(/[^a-fA-F0-9]/g, '')
      if (term) {
        filter.$expr = {
          $regexMatch: {
            input: { $toString: '$_id' },
            regex: term,
            options: 'i',
          },
        }
      }
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email'),
      Order.countDocuments(filter),
    ])

    res.json({
      orders,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total,
      hasMore: skip + orders.length < total,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * The admin verify check — re-confirm an order's payment straight from
 * Razorpay (not from our own records). Returns 'paid' | 'failed' |
 * 'pending'. 'paid' requires a CAPTURED payment whose amount equals the
 * order total in paise — the owner's rule, so a wrong-amount capture does
 * NOT count as paid.
 */
async function verifyWithRazorpay(order) {
  if (!order.razorpayOrderId) return 'pending'

  const { items = [] } = await razorpay.orders.fetchPayments(
    order.razorpayOrderId,
  )
  const expectedPaise = Math.round(order.total * 100)

  const cleanCapture = items.some(
    (p) => p.status === 'captured' && p.amount === expectedPaise,
  )
  if (cleanCapture) return 'paid'

  const anyCapture = items.some((p) => p.status === 'captured')
  if (!anyCapture && items.some((p) => p.status === 'failed')) return 'failed'
  return 'pending'
}

/** POST /api/orders/admin/:id/seen — mark an order opened by the admin. */
export async function markOrderSeen(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email',
    )
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    if (!order.seenByAdmin) {
      order.seenByAdmin = true
      await order.save()
    }
    res.json({ order })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/orders/admin/:id/verify — run (or re-run) the Razorpay verify
 * check and store the result on the order. Backs both the automatic check
 * on first open and the manual "Re-check" button.
 */
export async function verifyOrderPayment(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email',
    )
    if (!order) return res.status(404).json({ message: 'Order not found.' })

    order.verification = {
      status: await verifyWithRazorpay(order),
      checkedAt: new Date(),
    }
    await order.save()
    res.json({ order })
  } catch (err) {
    console.error('[verify] admin re-check failed:', err.message)
    next(err)
  }
}

/**
 * POST /api/orders/admin/:id/bill — generate the Bill of Supply for a paid
 * order: assign a consecutive serial, render the PDF, host it on Cloudinary,
 * store it on the order, and advance the order from `placed` to `accepted`.
 *
 * Note: the serial is drawn before the (rare) render/upload can fail, so a
 * failure can leave a one-number gap — acceptable, and far safer than the
 * alternative (a counter that decrements is not race-safe).
 */
export async function generateBillOfSupply(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email',
    )
    if (!order) return res.status(404).json({ message: 'Order not found.' })

    // A Bill of Supply is never re-issued — return the existing one.
    if (order.billOfSupply?.url) return res.json({ order })

    // Only a genuinely PAID order may be billed (and thereby accepted).
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        message: 'A Bill of Supply can only be generated for a paid order.',
      })
    }

    // Consecutive serial, unique per financial year.
    const fy = financialYear(new Date())
    const seq = await Counter.next(`bos-${fy}`)
    const number = `BS/${fy}/${String(seq).padStart(4, '0')}`

    // Render → host on Cloudinary as a raw asset.
    const pdf = await buildBillOfSupplyPdf(order, number)
    const url = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'sonari/bills',
          resource_type: 'raw',
          // The `.pdf` MUST be part of the public_id — for `raw` assets
          // Cloudinary treats the public_id literally and appends nothing,
          // so without it the delivered URL has no extension and the
          // browser serves it as octet-stream (a file that isn't a .pdf).
          public_id: `${number.replace(/\//g, '-')}.pdf`,
        },
        (err, result) => (err ? reject(err) : resolve(result.secure_url)),
      )
      stream.end(pdf)
    })

    order.billOfSupply = { number, url, issuedAt: new Date() }
    if (order.status === 'placed') order.status = 'accepted'
    await order.save()

    res.json({ order })
  } catch (err) {
    console.error('[bill] generation failed:', err.message)
    next(err)
  }
}

// Return window — the Refund & Cancellation policy's 10 days; stamped onto
// `returnDeadline` when an order is delivered (the window starts on
// receipt). Keep in step with the policy pages.
const RETURN_WINDOW_DAYS = 10
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * POST /api/orders/admin/:id/deliver — advance `dispatched → delivered` and
 * stamp `returnDeadline` (delivery date + the return window). The return
 * window only starts on receipt, so this is the first time it can be set.
 */
export async function markOrderDelivered(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email',
    )
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    if (order.status !== 'dispatched') {
      return res.status(400).json({
        message: 'Only a dispatched order can be marked delivered.',
      })
    }

    order.status = 'delivered'
    order.returnDeadline = new Date(Date.now() + RETURN_WINDOW_DAYS * DAY_MS)
    await order.save()
    res.json({ order })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/orders/admin/:id/fail-delivery — advance `dispatched →
 * failed-delivery` (the courier could not deliver the parcel).
 */
export async function markDeliveryFailed(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email',
    )
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    if (order.status !== 'dispatched') {
      return res.status(400).json({
        message: 'Only a dispatched order can be marked failed delivery.',
      })
    }
    order.status = 'failed-delivery'
    await order.save()
    res.json({ order })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/orders/admin/:id/manifest — manifest the order with Delhivery
 * (Order Creation). Body: { weight, length, width, height } (weight g, dims cm).
 * Creates the shipment + waybill and advances `accepted → manifested`
 * ("ready for pickup"). The pickup itself is booked separately, in a batch,
 * via the Pickups panel (createBatchPickup).
 */
export async function manifestOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email',
    )
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    if (order.paymentStatus !== 'paid') {
      return res
        .status(400)
        .json({ message: 'Only a paid order can be manifested.' })
    }
    if (order.status !== 'accepted') {
      return res
        .status(400)
        .json({ message: 'Only an accepted order can be manifested.' })
    }

    const { weight, length, width, height } = req.body
    if (!weight || Number(weight) <= 0) {
      return res
        .status(400)
        .json({ message: 'Package weight (in grams) is required.' })
    }

    const shipment = await createShipment(order, { weight, length, width, height })
    order.courier = 'delhivery'
    order.trackingId = shipment.waybill
    order.status = 'manifested'
    await order.save()
    res.json({ order })
  } catch (err) {
    // A manifest (createShipment) failure lands here — nothing was saved.
    console.error('[delhivery] manifest failed:', err.message)
    res
      .status(502)
      .json({ message: err.message || 'Delhivery manifest failed.' })
  }
}

/**
 * GET /api/orders/admin/manifested — orders that are manifested and awaiting
 * pickup (status 'manifested'), newest first. Backs the Pickups panel.
 */
export async function listManifested(req, res, next) {
  try {
    const orders = await Order.find({ status: 'manifested' })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
    res.json({ orders })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/orders/admin/pickup — schedule ONE Delhivery pickup that
 * collects every selected manifested order. Body:
 *   { orderIds: [...], pickupDate, pickupTime }
 * Books a single pickup (count = number of orders) and moves each order
 * `manifested → dispatched`, tagging it with the returned pickup id.
 */
export async function createBatchPickup(req, res, next) {
  try {
    const { orderIds, pickupDate, pickupTime } = req.body
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'Select at least one order for the pickup.' })
    }
    if (!pickupDate || !pickupTime) {
      return res
        .status(400)
        .json({ message: 'A pickup date and time are required.' })
    }

    // Only orders still 'manifested' can join a pickup.
    const orders = await Order.find({
      _id: { $in: orderIds },
      status: 'manifested',
    })
    if (orders.length === 0) {
      return res
        .status(400)
        .json({ message: 'None of the selected orders are ready for pickup.' })
    }

    const pickup = await schedulePickup({
      date: pickupDate,
      time: pickupTime,
      count: orders.length,
    })
    await Order.updateMany(
      { _id: { $in: orders.map((o) => o._id) } },
      { $set: { status: 'dispatched', pickupId: pickup.pickupId } },
    )
    res.json({ pickup, count: orders.length })
  } catch (err) {
    // schedulePickup failure lands here — no order was changed.
    console.error('[delhivery] pickup failed:', err.message)
    res
      .status(502)
      .json({ message: err.message || 'Delhivery pickup failed.' })
  }
}

/**
 * GET /api/orders/admin/:id/label — fetch the Delhivery shipping-label PDF
 * (Packing Slip) for a Delhivery shipment; returns a ~24h download URL.
 */
export async function getOrderLabel(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    if (order.courier !== 'delhivery' || !order.trackingId) {
      return res
        .status(400)
        .json({ message: 'No Delhivery shipment for this order yet.' })
    }
    const url = await getPackingSlip(order.trackingId)
    res.json({ url })
  } catch (err) {
    console.error('[delhivery] label fetch failed:', err.message)
    res
      .status(502)
      .json({ message: err.message || 'Could not fetch the label.' })
  }
}

/**
 * GET /api/orders/admin/bills — the Bill-of-Supply register: every order
 * that has a bill, within an optional issued-date range. Returns a
 * paginated list PLUS the count and turnover aggregated over the WHOLE
 * match — the figures the admin needs for the composition GST return.
 */
export async function listBills(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 40),
    )
    const skip = (page - 1) * limit

    const filter = { billOfSupply: { $ne: null } }
    if (req.query.from || req.query.to) {
      filter['billOfSupply.issuedAt'] = {}
      if (req.query.from) {
        filter['billOfSupply.issuedAt'].$gte = new Date(req.query.from)
      }
      if (req.query.to) {
        const to = new Date(req.query.to)
        to.setHours(23, 59, 59, 999) // include the whole end day
        filter['billOfSupply.issuedAt'].$lte = to
      }
    }

    const [bills, agg] = await Promise.all([
      Order.find(filter)
        .select('billOfSupply total shippingAddress user')
        .sort({ 'billOfSupply.issuedAt': -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email'),
      Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            turnover: { $sum: '$total' },
          },
        },
      ]),
    ])

    const { count = 0, turnover = 0 } = agg[0] || {}
    res.json({
      bills,
      page,
      count,
      turnover,
      hasMore: skip + bills.length < count,
    })
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

// The header Delhivery is told (in the Scan Push requirement doc) to send on
// every webhook POST, carrying our shared secret (DELHIVERY.webhookToken).
const DELHIVERY_WEBHOOK_HEADER = 'x-delhivery-token'

/**
 * POST /api/orders/delhivery-webhook — Delhivery's Scan Push.
 *
 * Delhivery POSTs every scan for a waybill here in real time:
 *   { Shipment: { Status: { Status, StatusType, StatusDateTime,
 *     StatusLocation, Instructions }, NSLCode, ReferenceNo, AWB } }
 *
 * We verify the shared-secret header, append the scan to the order's
 * `trackingScans` (deduped), and advance the order's own status on the
 * terminal scans. NOTE: StatusType 'DL' covers BOTH 'Delivered' AND 'RTO',
 * so we disambiguate by `Status` — never by type alone.
 *
 * Must reply 200 in <500ms (Delhivery times out and drops the scan
 * otherwise), so the work is one indexed lookup + save. Idempotent: a
 * re-pushed scan is deduped and the status guards are no-ops.
 */
export async function delhiveryWebhook(req, res) {
  try {
    // Verify it's really Delhivery (the token we put in the requirement doc).
    const expected = DELHIVERY.webhookToken
    if (!expected || req.get(DELHIVERY_WEBHOOK_HEADER) !== expected) {
      return res.status(401).json({ message: 'Unauthorized.' })
    }

    const ship = req.body?.Shipment
    const scan = ship?.Status
    // Malformed/empty — ack so Delhivery doesn't keep retrying it.
    if (!ship || !scan) return res.status(200).json({ received: true })

    const awb = String(ship.AWB || '').trim()
    const ref = String(ship.ReferenceNo || '').trim()

    // Look up by waybill (indexed); fall back to our order id (ReferenceNo).
    let order = awb ? await Order.findOne({ trackingId: awb }) : null
    if (!order && /^[0-9a-fA-F]{24}$/.test(ref)) order = await Order.findById(ref)
    // Unknown shipment — ack and move on (nothing of ours to update).
    if (!order) return res.status(200).json({ received: true })

    const statusType = String(scan.StatusType || '')
    const status = String(scan.Status || '')
    const scannedAt = scan.StatusDateTime ? new Date(scan.StatusDateTime) : new Date()

    // Append the scan unless we've already stored this exact one.
    const key = (t) =>
      `${t.statusType}|${t.status}|${
        t.scannedAt ? new Date(t.scannedAt).toISOString() : ''
      }`
    const incoming = { statusType, status, scannedAt }
    if (!order.trackingScans.some((t) => key(t) === key(incoming))) {
      order.trackingScans.push({
        status,
        statusType,
        nslCode: ship.NSLCode || '',
        location: scan.StatusLocation || '',
        instructions: scan.Instructions || '',
        scannedAt,
      })
    }

    // Terminal scans advance our own status. 'DL' is shared by Delivered and
    // RTO, so branch on `Status`, not the type.
    if (statusType === 'DL') {
      const s = status.toLowerCase()
      if (s === 'delivered' && order.status !== 'delivered') {
        order.status = 'delivered'
        // Stamp the return window from the REAL delivery date, not now().
        order.returnDeadline = new Date(
          scannedAt.getTime() + RETURN_WINDOW_DAYS * DAY_MS,
        )
      } else if (s === 'rto' && order.status !== 'failed-delivery') {
        order.status = 'failed-delivery'
      }
    }

    await order.save()
    return res.status(200).json({ received: true })
  } catch (err) {
    // A 500 lets Delhivery retry; our dedupe + guards make that safe.
    console.error('Delhivery webhook error:', err.message)
    return res.status(500).json({ message: 'Webhook processing error.' })
  }
}
