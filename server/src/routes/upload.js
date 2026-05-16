import { Router } from 'express'
import multer from 'multer'
import { uploadImage } from '../controllers/uploadController.js'
import { protect, requireAdmin } from '../middleware/auth.js'

/**
 * Multer holds the uploaded file in memory (no temp files on disk),
 * so the controller can stream the buffer straight to Cloudinary.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

const router = Router()

// upload.single('image') parses one file from the 'image' form field.
router.post('/', protect, requireAdmin, upload.single('image'), uploadImage)

export default router
