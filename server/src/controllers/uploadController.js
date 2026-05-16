import cloudinary from '../config/cloudinary.js'

/**
 * POST /api/upload — admin only.
 *
 * Multer (memory storage) puts the raw file on `req.file.buffer`.
 * We stream that buffer to Cloudinary and return the hosted URL —
 * the browser never touches the Cloudinary credentials.
 */
export function uploadImage(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' })
  }

  const stream = cloudinary.uploader.upload_stream(
    { folder: 'sonari/products' },
    (error, result) => {
      if (error) return next(error)
      res.status(201).json({ url: result.secure_url, publicId: result.public_id })
    },
  )

  stream.end(req.file.buffer)
}
