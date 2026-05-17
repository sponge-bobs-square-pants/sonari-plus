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

    // Fulfilment status (advanced from the admin panel later).
    status: {
      type: String,
      enum: ['placed', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },

    // Last day a return may be requested. Fixed when the order is created
    // (createdAt + the return window from the Refund & Cancellation policy),
    // so the deadline never shifts afterwards.
    returnDeadline: { type: Date },
  },
  { timestamps: true },
)

orderSchema.index({ user: 1, createdAt: -1 })

orderSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Order', orderSchema)
