import User from '../models/User.js'
import { signToken, cookieOptions, TOKEN_COOKIE } from '../utils/token.js'

/** Sign a token, set it as an httpOnly cookie, and return the user JSON. */
function sendAuth(res, status, user) {
  const token = signToken(user)
  res.cookie(TOKEN_COOKIE, token, cookieOptions)
  res.status(status).json({ user })
}

/** POST /api/auth/register — create a customer account. */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email and password are all required' })
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' })
    }

    // role is intentionally NOT taken from the body — always 'user'.
    const user = new User({ name, email })
    await user.setPassword(password)
    await user.save()

    sendAuth(res, 201, user)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/login — exchange credentials for a session cookie. */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() })
    // Same response whether the email is unknown or the password is
    // wrong — so the API can't be used to discover which emails exist.
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect email or password' })
    }

    sendAuth(res, 200, user)
  } catch (err) {
    next(err)
  }
}

/** GET /api/auth/me — return the currently authenticated user. */
export async function getMe(req, res) {
  res.json({ user: req.user })
}

/** POST /api/auth/logout — clear the session cookie. */
export function logout(req, res) {
  res.clearCookie(TOKEN_COOKIE, { ...cookieOptions, maxAge: undefined })
  res.json({ message: 'Logged out' })
}
