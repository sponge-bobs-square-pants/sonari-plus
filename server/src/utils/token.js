import jwt from 'jsonwebtoken'

/** Name of the httpOnly cookie that carries the auth token. */
export const TOKEN_COOKIE = 'sonari_token'

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Sign a JWT for a user. The role is embedded in the payload so
 * `requireAdmin` can authorize without a database lookup — the
 * signature guarantees the role wasn't tampered with.
 */
export function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}

/**
 * Sign a short-lived, single-purpose token for the email-verification link.
 * `purpose` is checked on the way back so a session token can't be replayed
 * as a verify token (or vice-versa). Stateless — nothing stored server-side.
 */
export function signEmailVerifyToken(user) {
  return jwt.sign(
    { id: user._id, purpose: 'verify-email' },
    process.env.JWT_SECRET,
    { expiresIn: '1d' },
  )
}

/** Verify an email-verification token; returns the user id, or null if bad. */
export function readEmailVerifyToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    return payload.purpose === 'verify-email' ? payload.id : null
  } catch {
    return null
  }
}

/**
 * Cookie options for the auth token.
 *  - httpOnly: JavaScript (and therefore XSS) cannot read it
 *  - secure:   HTTPS-only in production; off for local http dev
 *  - sameSite: 'lax' is correct even across subdomains — www.nuit.in and
 *    backend.nuit.in share the same registrable site (nuit.in), so the API
 *    call counts as *same-site* and Lax cookies are sent. (Lax only blocks
 *    truly cross-site requests, so it keeps CSRF surface smaller than 'none'.)
 *    The cookie is host-only to backend.nuit.in — no Domain attribute needed.
 */
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: MAX_AGE_MS,
}
