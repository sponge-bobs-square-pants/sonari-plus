import { Router } from 'express'
import {
  createOrder,
  verifyPayment,
  listMyOrders,
  listAllOrders,
  markOrderSeen,
  verifyOrderPayment,
  generateBillOfSupply,
  manifestOrder,
  listManifested,
  createBatchPickup,
  getOrderLabel,
  markOrderDelivered,
  markDeliveryFailed,
  listBills,
  razorpayWebhook,
  delhiveryWebhook,
} from '../controllers/orderController.js'
import { protect, requireAdmin } from '../middleware/auth.js'

const router = Router()

// Server-to-server webhooks — authenticated by signature / shared-secret
// header, NOT by a session. Declared before `protect` so they aren't gated.
router.post('/webhook', razorpayWebhook)
router.post('/delhivery-webhook', delhiveryWebhook)

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
router.post('/admin/:id/manifest', requireAdmin, manifestOrder)
router.get('/admin/manifested', requireAdmin, listManifested)
router.post('/admin/pickup', requireAdmin, createBatchPickup)
router.get('/admin/:id/label', requireAdmin, getOrderLabel)
router.post('/admin/:id/deliver', requireAdmin, markOrderDelivered)
router.post('/admin/:id/fail-delivery', requireAdmin, markDeliveryFailed)

export default router
