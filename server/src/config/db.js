import mongoose from 'mongoose'

/** Connect to MongoDB. Throws (caught by the caller) if MONGO_URI is missing. */
export default async function connectDB() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('MONGO_URI is not set — add it to server/.env')
  }
  await mongoose.connect(uri)
  console.log('✓ MongoDB connected')
}
