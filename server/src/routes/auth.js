import { Router } from 'express'
import {
  register,
  login,
  logout,
  getMe,
  verifyEmail,
  resendVerification,
} from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.get('/me', protect, getMe) // protect → only runs if authenticated
router.post('/verify-email', verifyEmail) // token is the proof — no session
router.post('/resend-verification', protect, resendVerification)

export default router
