import mongoose from 'mongoose'

/**
 * A named atomic counter — one document per sequence. Used for gap-free
 * serial numbers, e.g. each financial year's Bill of Supply run.
 *
 * `Counter.next(name)` does an upsert + `$inc` in a single atomic
 * `findOneAndUpdate`, so concurrent requests can never collide on, or
 * skip, a number — which a legal serial (a Bill of Supply) requires.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String }, // the sequence name, e.g. 'bos-2025-26'
  seq: { type: Number, default: 0 },
})

/** Atomically advance the named sequence and return the new value. */
counterSchema.statics.next = async function (name) {
  const doc = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  )
  return doc.seq
}

export default mongoose.model('Counter', counterSchema)
