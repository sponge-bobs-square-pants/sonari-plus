/**
 * The GUEST cart store — localStorage.
 *
 * Signed-out visitors keep their bag here so it survives a refresh.
 * Once they sign in the items are merged into the DB cart and this is
 * cleared (see cartListener.js). A signed-in user's cart lives in the
 * database, never here.
 */
const KEY = 'sonari_cart'

export function readCart() {
  try {
    const raw = localStorage.getItem(KEY)
    const items = raw ? JSON.parse(raw) : []
    return Array.isArray(items) ? items : []
  } catch {
    return [] // disabled storage / corrupt JSON — start empty
  }
}

export function writeCart(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* storage full or disabled — Redux still holds the cart */
  }
}

export function clearStoredCart() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
