import mongoose from 'mongoose'

/** One ordered line — a snapshot taken at the time the order was placed. */
const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, default: '' },
    company: { type: String, default: '' },
    image: { type: String, default: '' },
    color: { type: String, default: '' },
    hex: { type: String, default: '' },
    size: { type: String, default: '' },
    // Bra cup (band is `size`); empty for every other category.
    cup: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

/** Where the order ships to — captured at checkout. */
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false },
)

/**
 * The admin's Razorpay re-confirmation of an order's payment (the "verify
 * check"). Null until first checked. `status` is Razorpay's real verdict —
 * compared against `paymentStatus` to surface any discrepancy.
 */
const verificationSchema = new mongoose.Schema(
  {
    // 'paid' only when Razorpay shows a CAPTURED payment whose amount
    // equals the order total; otherwise 'failed' / 'pending'.
    status: { type: String, enum: ['paid', 'failed', 'pending'] },
    checkedAt: { type: Date },
  },
  { _id: false },
)

/**
 * The Bill of Supply generated for a paid order — null until the admin
 * generates it. `number` is the consecutive per-financial-year serial,
 * `url` the hosted PDF.
 */
const billOfSupplySchema = new mongoose.Schema(
  {
    number: { type: String }, // e.g. 'BS/2025-26/0001'
    // Cloudinary public_id of the PRIVATE (authenticated) PDF. The invoice
    // is never publicly reachable — it's streamed only through the
    // owner/admin-gated GET /api/orders/:id/invoice proxy, which signs a
    // short-lived URL server-side. `url` is the (signature-required) hosted
    // address, kept for reference; it is NOT a public link.
    publicId: { type: String },
    url: { type: String },
    issuedAt: { type: Date },
  },
  { _id: false },
)

/**
 * One Delhivery tracking scan, pushed in real time by the Scan Push webhook
 * (POST /api/orders/delhivery-webhook). Append-only; the UI sorts by
 * `scannedAt`. `statusType` is Delhivery's family code — UD (in transit),
 * DL (Delivered OR RTO — disambiguate by `status`), RT/PP/PU/CN (returns).
 */
const trackingScanSchema = new mongoose.Schema(
  {
    status: { type: String, default: '' }, // 'In Transit', 'Delivered', 'RTO'…
    statusType: { type: String, default: '' }, // UD | DL | RT | PP | PU | CN
    nslCode: { type: String, default: '' }, // granular code, e.g. 'X-UCI'
    location: { type: String, default: '' }, // StatusLocation
    instructions: { type: String, default: '' },
    scannedAt: { type: Date }, // StatusDateTime
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: { type: [orderItemSchema], default: [] },
    shippingAddress: { type: shippingAddressSchema, required: true },

    // Money — all server-computed; never trust client totals.
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    // Razorpay linkage.
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
    },

    // Fulfilment status, advanced from the admin panel:
    //   placed → accepted (Bill of Supply generated)
    //          → manifested (Delhivery shipment created — ready for pickup)
    //          → dispatched (pickup scheduled) → delivered.
    // Plus cancelled / failed-delivery.
    status: {
      type: String,
      enum: [
        'placed',
        'accepted',
        'manifested',
        'dispatched',
        'delivered',
        'cancelled',
        'failed-delivery',
      ],
      default: 'placed',
    },

    // Last day a return may be requested — stamped when the order is marked
    // DELIVERED (delivery date + the Refund & Cancellation policy's return
    // window), since the window starts on receipt. Null until delivered.
    returnDeadline: { type: Date },

    // Has an admin opened this order yet? Drives the "New" badge — set
    // true the first time the admin views the order.
    seenByAdmin: { type: Boolean, default: false },

    // Result of the admin's Razorpay verify check (null until run).
    verification: { type: verificationSchema, default: null },

    // The Bill of Supply — null until the admin generates it.
    billOfSupply: { type: billOfSupplySchema, default: null },

    // Courier — Delhivery is the only shipping path; set when the parcel is
    // manifested (it mints the waybill).
    courier: {
      type: String,
      enum: ['', 'delhivery'],
      default: '',
    },
    trackingId: { type: String, default: '' },

    // Delhivery pickup-request id — set when a courier pickup is booked
    // for this order's parcel at dispatch (null until then).
    pickupId: { type: Number, default: null },

    // Delhivery tracking scans, pushed in real time via the Scan Push
    // webhook. Append-only (deduped on statusType+status+scannedAt). The
    // 'DL'/'Delivered' scan flips the order to delivered (+ stamps
    // returnDeadline from the real delivery date); 'DL'/'RTO' → failed-delivery.
    trackingScans: { type: [trackingScanSchema], default: [] },
  },
  { timestamps: true },
)

// The Scan Push webhook looks orders up by waybill on every scan — keep it
// indexed so that lookup stays well under Delhivery's 500ms response budget.
orderSchema.index({ trackingId: 1 })

orderSchema.index({ user: 1, createdAt: -1 })

orderSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Order', orderSchema)
