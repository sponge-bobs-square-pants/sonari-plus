import { v2 as cloudinary } from 'cloudinary'

/**
 * Cloudinary SDK, configured from environment variables.
 * The api_secret lives only here on the server — it is never sent
 * to the browser, which is why uploads are proxied through Express.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary
