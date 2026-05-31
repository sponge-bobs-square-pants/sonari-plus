/**
 * URL slug for a product name — readable, ASCII-only, hyphen-joined.
 * Reduces "Long Cotton Nightdress" → "long-cotton-nightdress" and
 * "Café à la mode" → "cafe-a-la-mode" (diacritics stripped).
 *
 * The output never starts or ends with a hyphen, and is capped at 80
 * chars so a runaway product name never produces a URL Google chokes on.
 */
export function slugify(text) {
  return String(text || '')
    .normalize('NFKD') // split diacritics from their letters
    .replace(/[̀-ͯ]/g, '') // strip the combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // anything non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 80)
}

// A Mongo ObjectId is exactly 24 lowercase-hex chars. Used to extract
// the ID at the tail end of a slug, and as the canonical-URL check.
const OBJECT_ID = /[a-f0-9]{24}/i
const OBJECT_ID_TAIL = /[a-f0-9]{24}$/i

/**
 * The canonical product URL — `/product/<slug>-<id>`. Falls back to a
 * bare `/product/<id>` if the name is empty (e.g. a half-saved product).
 * Old `/product/<id>` URLs continue to resolve because productIdFromSlug
 * extracts the trailing 24-hex regardless of what precedes it.
 *
 * Pass anything carrying { _id, name } — a Product document, a cart
 * line snapshot ({ productId, name }), or an order item — and use the
 * second arg to point at the right id field when it isn't `_id`.
 */
export function productPath(obj, idField = '_id') {
  if (!obj) return '#'
  const id = obj[idField] || obj.productId || obj.id
  if (!id) return '#'
  const slug = slugify(obj.name)
  return slug ? `/product/${slug}-${id}` : `/product/${id}`
}

/**
 * Pull the 24-char Mongo ObjectId out of a slug-or-id URL segment.
 * Returns `null` when nothing matches (the page should 404 in that case).
 */
export function productIdFromSlug(slugOrId) {
  return slugOrId ? (slugOrId.match(OBJECT_ID_TAIL) || [null])[0] : null
}

/** True when the param looks like ONLY an ObjectId (the old URL shape). */
export function isBareObjectId(slugOrId) {
  return typeof slugOrId === 'string' && OBJECT_ID.test(slugOrId) && slugOrId.length === 24
}
