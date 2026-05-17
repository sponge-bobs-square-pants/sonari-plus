import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

/** A saved delivery address — each keeps its own _id for pick / delete. */
const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, default: '', trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
})

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name is too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please use a valid email'],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    // The two access levels. Signup always creates 'user';
    // 'admin' is granted only by the seed script.
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // Delivery addresses the customer has chosen to save.
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true },
)

/** Hash a plain-text password and store it on the document. */
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12)
}

/** Compare a candidate password against the stored hash. */
userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

// Never let the password hash leave the server in an API response.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash
    delete ret.__v
    return ret
  },
})

export default mongoose.model('User', userSchema)
