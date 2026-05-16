import mongoose from 'mongoose'

/**
 * One cart line — a snapshot of a buyable variant at add-to-bag time.
 * Product details (name, image, price) are copied in rather than
 * referenced so the bag survives a product edit; checkout will be
 * responsible for re-validating price and stock against the live
 * Product before an order is placed.
 */
const cartItemSchema = new mongoose.Schema(
  {
    lineId: { type: String, required: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, default: '' },
    company: { type: String, default: '' },
    image: { type: String, default: '' },
    color: { type: String, default: '' },
    hex: { type: String, default: '' },
    size: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false },
)

/** One cart per user — `user` is unique, so a user never has two. */
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
)

cartSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Cart', cartSchema)
