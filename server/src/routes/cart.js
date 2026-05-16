import { Router } from 'express'
import { getCart, saveCart, mergeCart } from '../controllers/cartController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

// The cart belongs to a user — every route needs a valid session.
router.use(protect)

router.get('/', getCart)
router.put('/', saveCart)
router.post('/merge', mergeCart)

export default router
