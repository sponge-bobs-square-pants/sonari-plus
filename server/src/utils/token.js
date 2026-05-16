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
 * Cookie options for the auth token.
 *  - httpOnly: JavaScript (and therefore XSS) cannot read it
 *  - secure:   HTTPS-only in production; off for local http dev
 *  - sameSite: 'lax' is fine — client and API share the localhost site
 */
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: MAX_AGE_MS,
}
