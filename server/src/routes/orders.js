import { Router } from 'express'
import {
  createOrder,
  verifyPayment,
  listMyOrders,
  listAllOrders,
  markOrderSeen,
  verifyOrderPayment,
  generateBillOfSupply,
  listBills,
  razorpayWebhook,
} from '../controllers/orderController.js'
import { protect, requireAdmin } from '../middleware/auth.js'

const router = Router()

// Razorpay's webhook — authenticated by signature, NOT by a session.
// Declared before `protect` so it isn't gated by it.
router.post('/webhook', razorpayWebhook)

// Everything else belongs to a user — needs a valid session.
router.use(protect)

router.post('/create', createOrder)
router.post('/verify', verifyPayment)
router.get('/', listMyOrders)

// Admin only — order management.
router.get('/admin', requireAdmin, listAllOrders)
router.get('/admin/bills', requireAdmin, listBills)
router.post('/admin/:id/seen', requireAdmin, markOrderSeen)
router.post('/admin/:id/verify', requireAdmin, verifyOrderPayment)
router.post('/admin/:id/bill', requireAdmin, generateBillOfSupply)

export default router
