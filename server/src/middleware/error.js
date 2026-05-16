/** 404 handler for unmatched routes. */
export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

/**
 * Central error handler. Translates the common Mongoose errors into
 * clean HTTP responses so controllers can just `next(err)`.
 */
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
export function errorHandler(err, req, res, next) {
  // Duplicate key — e.g. registering an email that already exists
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That email is already registered' })
  }
  // Schema validation failure
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0]
    return res.status(400).json({ message: first?.message || 'Invalid input' })
  }
  // Malformed id in the URL (e.g. /api/products/not-an-id)
  if (err.name === 'CastError') {
    return res.status(404).json({ message: 'Not found' })
  }
  // File upload errors (size limit, etc.)
  if (err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 5 MB or smaller'
        : 'Image upload failed'
    return res.status(400).json({ message })
  }

  console.error(err)
  res
    .status(err.status || 500)
    .json({ message: err.message || 'Something went wrong' })
}
