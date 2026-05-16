import Cart from '../models/Cart.js'

/** A cart line is unique per product + colour + size. */
const lineKey = (it) => `${it.productId}__${it.color}__${it.size}`

/**
 * Normalise items coming from the client — the cart is user-supplied,
 * so coerce types, drop anything without a product/size, and clamp
 * quantity to a sane minimum.
 */
function cleanItems(items) {
  if (!Array.isArray(items)) return []
  return items
    .filter((it) => it && it.productId && it.size)
    .map((it) => ({
      lineId: it.lineId || lineKey(it),
      productId: it.productId,
      name: it.name || '',
      company: it.company || '',
      image: it.image || '',
      color: it.color || '',
      hex: it.hex || '',
      size: it.size,
      price: Number(it.price) || 0,
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    }))
}

/** GET /api/cart — the signed-in user's cart. */
export async function getCart(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
    res.json({ items: cart ? cart.items : [] })
  } catch (err) {
    next(err)
  }
}

/** PUT /api/cart — replace the cart wholesale with the given items. */
export async function saveCart(req, res, next) {
  try {
    const items = cleanItems(req.body.items)
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items },
      { new: true, upsert: true, runValidators: true },
    )
    res.json({ items: cart.items })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/cart/merge — fold the given (guest) items into the user's
 * stored cart and return the result. Matching lines have their
 * quantities summed; new lines are appended. Used at sign-in, so an
 * empty body simply returns the existing cart.
 */
export async function mergeCart(req, res, next) {
  try {
    const incoming = cleanItems(req.body.items)
    const cart =
      (await Cart.findOne({ user: req.user._id })) ||
      new Cart({ user: req.user._id, items: [] })

    for (const item of incoming) {
      const key = lineKey(item)
      const existing = cart.items.find((i) => lineKey(i) === key)
      if (existing) existing.quantity += item.quantity
      else cart.items.push(item)
    }

    await cart.save()
    res.json({ items: cart.items })
  } catch (err) {
    next(err)
  }
}
