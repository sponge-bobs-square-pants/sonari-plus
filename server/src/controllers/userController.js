/* User-profile actions. New saved addresses are added via the checkout
   flow (orderController); this file handles removing them. */

/** DELETE /api/users/addresses/:id — remove one saved address. */
export async function deleteAddress(req, res, next) {
  try {
    req.user.addresses.pull(req.params.id)
    await req.user.save()
    res.json({ addresses: req.user.addresses })
  } catch (err) {
    next(err)
  }
}
