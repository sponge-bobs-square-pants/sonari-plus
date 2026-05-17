import { Router } from 'express'
import { deleteAddress } from '../controllers/userController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

// Profile routes — every one needs a valid session.
router.use(protect)

router.delete('/addresses/:id', deleteAddress)

export default router
