import { Router } from 'express'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js'
import { protect, requireAdmin } from '../middleware/auth.js'

const router = Router()

// Public — the storefront reads these.
router.get('/', listProducts)
router.get('/:id', getProduct)

// Admin only — protect verifies the session, requireAdmin checks the role.
router.post('/', protect, requireAdmin, createProduct)
router.put('/:id', protect, requireAdmin, updateProduct)
router.delete('/:id', protect, requireAdmin, deleteProduct)

export default router
