import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { TOKEN_COOKIE } from '../utils/token.js'

/**
 * Verify the JWT from the httpOnly cookie and attach the live user
 * document to `req.user`. Rejects with 401 if missing/invalid.
 */
export async function protect(req, res, next) {
  try {
    const token = req.cookies?.[TOKEN_COOKIE]
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.id)
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists' })
    }

    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Session expired or invalid' })
  }
}

/**
 * Gate a route to admins only. Must run AFTER `protect`, which
 * populates `req.user`.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' })
  }
  next()
}
