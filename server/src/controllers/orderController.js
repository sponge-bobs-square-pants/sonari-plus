import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import Product, { effectiveVariantPrice } from '../models/Product.js'
import Counter from '../models/Counter.js'
import cloudinary from '../config/cloudinary.js'
import {
  activeProviderName,
  getActiveProvider,
  getProviderForOrder,
  getProviderByName,
} from '../payments/index.js'
import { financialYear, buildBillOfSupplyPdf } from '../utils/billOfSupply.js'
import { sendBillOfSupplyEmail } from '../utils/mailer.js'
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
 * The idempotent paid-path — used by BOTH the browser-verify endpoint
 * and the S2S webhooks. The guard on paymentStatus is what makes the
 * second arrival a harmless no-op; whichever path fires first wins.
 */
async function markOrderPaid(order, paymentId) {
  if (order.paymentStatus === 'paid') return // idempotent
  const provider = getProviderForOrder(order)
  order.paymentStatus = 'paid'
  if (paymentId) provider.stampPaymentId(order, paymentId)
  await order.save()
  await Cart.findOneAndUpdate({ user: order.user }, { items: [] })
  await reduceStockForOrder(order)
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
      // Match on BOTH axes — for bras two variants can share a band and
      // differ only by cup, so size alone wouldn't identify one.
      const variant = color?.sizes.find(
        (s) => s.size === item.size && (s.cup || '') === (item.cup || ''),
      )
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
        ?.sizes.find(
          (s) => s.size === i.size && (s.cup || '') === (i.cup || ''),
        )
      const available = variant?.stock ?? 0
      if (available < i.quantity) {
        const label = i.cup ? `${i.size}${i.cup}` : i.size
        return res.status(400).json({
          message: `Only ${available} left of ${i.name} (${i.color} · ${label}). Please update your cart.`,
        })
      }
    }

    const items = cart.items.map((i) => {
      const product = productById[String(i.productId)]
      // Look up the LIVE variant — the cart snapshot's price is informational
      // only; the server decides what's charged. This is also where a stale
      // cart catches up to a fresh discount (or a discount that ended).
      const variant = product?.colors
        .find((c) => c.name === i.color)
        ?.sizes.find(
          (s) => s.size === i.size && (s.cup || '') === (i.cup || ''),
        )
      const price = variant ? effectiveVariantPrice(variant) : i.price
      // Stamp the MRP onto the order ONLY when this is a real discount.
      const mrp = variant && variant.price > price ? variant.price : null
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
        cup: i.cup || '',
        price,
        mrp,
        quantity: i.quantity,
      }
    })
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
    const total = subtotal + deliveryFee

    // Our order first — provider is stamped so verify / webhook always
    // know which gateway to call later, regardless of any env switch in
    // between. (`returnDeadline` is NOT set here — the return window
    // starts on delivery, so it's stamped when the order is marked delivered.)
    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress: address,
      subtotal,
      deliveryFee,
      total,
      provider: activeProviderName(),
    })

    // Provider-specific checkout session. Razorpay returns popup data;
    // PhonePe returns a redirectUrl. The client branches on `provider`.
    let checkout
    try {
      checkout = await getActiveProvider().createCheckout(order)
    } catch (err) {
      console.error('[checkout] provider createCheckout failed:', err.message)
      return res
        .status(502)
        .json({ message: 'Could not reach the payment service. Please try again.' })
    }

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

    res.status(201).json({ orderId: order._id, ...checkout })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/orders/verify — confirm a payment after the customer returns
 * from the gateway. Dispatches to the right provider based on the order's
 * stamped `provider`. Accepts either `{ orderId }` (new shape used by both
 * flows) OR `{ razorpay_order_id, ... }` (legacy Razorpay shape, to keep
 * deploys safe while old clients are still around).
 */
export async function verifyPayment(req, res, next) {
  try {
    const { orderId, razorpay_order_id } = req.body
    const order = await Order.findOne({
      $or: [
        orderId ? { _id: orderId } : null,
        razorpay_order_id ? { razorpayOrderId: razorpay_order_id } : null,
      ].filter(Boolean),
      user: req.user._id,
    })
    if (!order) return res.status(404).json({ message: 'Order not found.' })

    // Already finalised — return it (handles a duplicate callback).
    if (order.paymentStatus === 'paid') return res.json({ order })

    const provider = getProviderForOrder(order)
    const { valid, paymentId, pending } = await provider.verifyClientCallback(
      order,
      req.body,
    )
    // PhonePe specifically can take a few seconds after the browser
    // redirect to flip COMPLETED — return 202 so the client polls
    // rather than marking the order failed.
    if (pending) {
      return res.status(202).json({ status: 'pending', orderId: order._id })
    }
    if (!valid) {
      console.warn(`[verify] ${provider.name} rejected — order ${order._id}`)
      order.paymentStatus = 'failed'
      await order.save()
      return res.status(400).json({ message: 'Payment verification failed.' })
    }

    await markOrderPaid(order, paymentId)
    console.log(
      `[verify] order ${order._id} confirmed paid via ${provider.name} · txn ${paymentId}`,
    )
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
 * its provider (NOT from our records). Returns 'paid' | 'failed' | 'pending'.
 * 'paid' requires a CAPTURED payment whose amount equals the order total
 * — the owner's rule, so a wrong-amount capture does NOT count as paid.
 */
async function verifyWithProvider(order) {
  const provider = getProviderForOrder(order)
  return provider.recheckStatus(order)
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
      status: await verifyWithProvider(order),
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

    // Render → host on Cloudinary as a PRIVATE (authenticated) raw asset.
    // `type: 'authenticated'` means the plain URL is NOT publicly reachable —
    // it requires a signature, so invoices can't be enumerated/leaked. We
    // deliver it only through the owner-gated /invoice proxy below.
    const pdf = await buildBillOfSupplyPdf(order, number)
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'sonari/bills',
          resource_type: 'raw',
          type: 'authenticated',
          // The `.pdf` MUST be part of the public_id — for `raw` assets
          // Cloudinary treats the public_id literally and appends nothing.
          public_id: `${number.replace(/\//g, '-')}.pdf`,
        },
        (err, result) => (err ? reject(err) : resolve(result)),
      )
      stream.end(pdf)
    })

    order.billOfSupply = {
      number,
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
      issuedAt: new Date(),
    }
    if (order.status === 'placed') order.status = 'accepted'
    await order.save()

    // Email the customer their invoice (PDF attached) — best-effort. The bill
    // is already saved, so a mail failure must not fail the request.
    sendBillOfSupplyEmail(order, pdf).catch((err) =>
      console.error('[bill] invoice email failed:', err.message),
    )

    res.json({ order })
  } catch (err) {
    console.error('[bill] generation failed:', err.message)
    next(err)
  }
}

/**
 * GET /api/orders/:id/invoice — stream the Bill of Supply PDF.
 *
 * The PDF lives on Cloudinary as a PRIVATE (authenticated) asset, so it is
 * NOT publicly reachable. Access is gated HERE by session: only the order's
 * owner or an admin may fetch it. We sign a URL server-side, fetch the bytes,
 * and stream them — the Cloudinary URL never reaches the browser.
 */
export async function getInvoice(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found.' })

    const isOwner = order.user.toString() === req.user._id.toString()
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed.' })
    }

    const bill = order.billOfSupply
    if (!bill?.publicId) {
      return res.status(404).json({ message: 'No invoice for this order yet.' })
    }

    // Sign the private asset's URL with our secret (stays server-side).
    const signed = cloudinary.url(bill.publicId, {
      resource_type: 'raw',
      type: 'authenticated',
      sign_url: true,
      secure: true,
    })
    const upstream = await fetch(signed)
    if (!upstream.ok) {
      return res.status(502).json({ message: 'Could not retrieve the invoice.' })
    }

    const buf = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="nuit-invoice-${bill.number.replace(/\//g, '-')}.pdf"`,
    )
    res.send(buf)
  } catch (err) {
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
  return handleProviderWebhook(req, res, 'razorpay', {
    paidEvents: ['payment.captured'],
    failedEvents: ['payment.failed'],
  })
}

/**
 * POST /api/orders/phonepe-webhook — PhonePe's S2S callback. Authenticated
 * by `Authorization: SHA256(username:password)` matching the pair we set
 * in the PhonePe portal. Mounted before `protect` (no session) — the same
 * spot as the Razorpay webhook.
 */
export async function phonepeWebhook(req, res) {
  // TEMP: visibility for the PhonePe portal's "Validate" + first live tests.
  // Strip these once we've confirmed the wiring end-to-end.
  console.log('📩 [phonepe webhook] HIT', {
    method: req.method,
    contentType: req.headers['content-type'],
    hasAuthHeader: Boolean(req.headers['authorization']),
    bodyKeys: req.body ? Object.keys(req.body) : null,
    event: req.body?.event,
    payloadKeys: req.body?.payload ? Object.keys(req.body.payload) : null,
  })
  return handleProviderWebhook(req, res, 'phonepe', {
    paidEvents: ['checkout.order.completed', 'pg.checkout.order.completed'],
    failedEvents: ['checkout.order.failed', 'pg.checkout.order.failed'],
  })
}

/**
 * Shared S2S webhook plumbing — every provider's webhook does the same
 * three things: verify signature, find OUR order, advance state. Only
 * which events count as paid / failed differs per provider.
 *
 * Idempotent: markOrderPaid guards on paymentStatus, so a re-pushed
 * webhook does nothing the second time.
 */
async function handleProviderWebhook(req, res, providerName, { paidEvents, failedEvents }) {
  try {
    const provider = getProviderByName(providerName)
    if (!provider) {
      return res.status(500).json({ message: `Provider ${providerName} not configured.` })
    }
    const { valid, event, providerOrderId, paymentId } = await provider.verifyWebhook(req)
    if (!valid) {
      console.warn(`[webhook:${providerName}] INVALID — rejected`)
      return res.status(400).json({ message: 'Invalid webhook.' })
    }

    if (providerOrderId) {
      const order = await provider.findOrderByWebhook(Order, providerOrderId)
      if (order && paidEvents.includes(event)) {
        await markOrderPaid(order, paymentId)
        console.log(`[webhook:${providerName}] order ${order._id} marked paid`)
      } else if (
        order &&
        failedEvents.includes(event) &&
        order.paymentStatus === 'created'
      ) {
        order.paymentStatus = 'failed'
        await order.save()
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error(`[webhook:${providerName}] error:`, err.message)
    // A 500 tells the provider to retry the webhook later.
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
