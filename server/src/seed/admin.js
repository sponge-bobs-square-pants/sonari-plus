import 'dotenv/config'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import User from '../models/User.js'

/**
 * Creates (or promotes) the first admin from env vars.
 * Run once with:  npm run seed:admin
 *
 * Admin creation lives here — off the public API — so no one can
 * grant themselves admin by hitting an endpoint.
 */
async function run() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('✗ Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first.')
    process.exit(1)
  }

  await connectDB()

  const email = ADMIN_EMAIL.toLowerCase().trim()
  let user = await User.findOne({ email })

  if (user) {
    user.role = 'admin'
    await user.setPassword(ADMIN_PASSWORD)
    await user.save()
    console.log(`✓ Promoted existing account to admin: ${user.email}`)
  } else {
    user = new User({ name: ADMIN_NAME || 'Sonari Admin', email, role: 'admin' })
    await user.setPassword(ADMIN_PASSWORD)
    await user.save()
    console.log(`✓ Created admin account: ${user.email}`)
  }

  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error('✗ Seed failed:', err.message)
  process.exit(1)
})
