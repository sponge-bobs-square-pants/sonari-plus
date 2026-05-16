import 'dotenv/config'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import Product from '../models/Product.js'

/**
 * One-off migration: recompute `priceFrom` on every existing product.
 *
 * `priceFrom` used to be a virtual; it is now a real, indexed field
 * (see models/Product.js). Products created before that change have no
 * stored value — run this once so they sort and price-filter correctly:
 *
 *   npm run backfill:price
 *
 * Re-running it is harmless: the pre('save') hook just recomputes.
 */
async function run() {
  await connectDB()
  const products = await Product.find()
  for (const product of products) {
    await product.save() // pre('save') recomputes priceFrom
  }
  console.log(`✓ Backfilled priceFrom on ${products.length} product(s)`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('✗ Backfill failed:', err.message)
  process.exit(1)
})
