import User from '../models/User.js'
import {
  signToken,
  cookieOptions,
  TOKEN_COOKIE,
  readEmailVerifyToken,
} from '../utils/token.js'
import { sendVerificationEmail } from '../utils/mailer.js'

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

    // Fire the verification email — best-effort. NEVER block signup on it;
    // if SMTP hiccups, the user is still created and can resend later.
    sendVerificationEmail(user).catch((err) =>
      console.error('Verification email failed:', err.message),
    )

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

/**
 * POST /api/auth/verify-email — confirm an email from the link's token.
 * No session needed: the signed token IS the proof (it may be opened on a
 * different device than the one logged in). Idempotent.
 */
export async function verifyEmail(req, res, next) {
  try {
    const id = readEmailVerifyToken(req.body.token)
    if (!id) {
      return res
        .status(400)
        .json({ message: 'This verification link is invalid or has expired.' })
    }
    const user = await User.findById(id)
    if (!user) return res.status(404).json({ message: 'Account not found.' })

    if (!user.emailVerified) {
      user.emailVerified = true
      await user.save()
    }
    res.json({ message: 'Email verified.', emailVerified: true })
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/resend-verification — re-send the link to the logged-in user. */
export async function resendVerification(req, res, next) {
  try {
    if (req.user.emailVerified) {
      return res.json({ message: 'Your email is already verified.' })
    }
    await sendVerificationEmail(req.user)
    res.json({ message: 'Verification email sent — check your inbox.' })
  } catch (err) {
    next(err)
  }
}
