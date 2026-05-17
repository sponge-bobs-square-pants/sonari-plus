import { Router } from 'express'
import {
  createOrder,
  verifyPayment,
  listMyOrders,
  razorpayWebhook,
} from '../controllers/orderController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

// Razorpay's webhook — authenticated by signature, NOT by a session.
// Declared before `protect` so it isn't gated by it.
router.post('/webhook', razorpayWebhook)

// Everything else belongs to a user — needs a valid session.
router.use(protect)

router.post('/create', createOrder)
router.post('/verify', verifyPayment)
router.get('/', listMyOrders)

export default router
