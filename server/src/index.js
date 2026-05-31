import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import connectDB from './config/db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import uploadRoutes from './routes/upload.js'
import cartRoutes from './routes/cart.js'
import orderRoutes from './routes/orders.js'
import userRoutes from './routes/users.js'
import sitemapRoute from './routes/sitemap.js'
import { notFound, errorHandler } from './middleware/error.js'

const app = express()
const PORT = process.env.PORT || 5000
// Allowed browser origins — comma-separated in CLIENT_URL. In prod this is
// the storefront's real origin(s), e.g. "https://www.nuit.in,https://nuit.in";
// in dev it's the Vite server. (Backend lives at backend.nuit.in — a
// different origin, so the frontend's calls are cross-origin and need CORS.)
const CLIENT_URLS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// `credentials: true` + specific origins lets the browser send and receive
// the httpOnly auth cookie on cross-origin requests (the SPA on www.nuit.in
// calling the API on backend.nuit.in).
app.use(cors({ origin: CLIENT_URLS, credentials: true }))
app.use(
  express.json({
    // Keep the raw body — the Razorpay webhook verifies its signature
    // against the exact bytes received, not the re-serialised JSON.
    verify: (req, _res, buf) => {
      req.rawBody = buf
    },
  }),
)
app.use(cookieParser())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/users', userRoutes)

// Crawler-facing — mounted at root because Google fetches /sitemap.xml.
// Reach it directly at backend.nuit.in/sitemap.xml, or proxy it onto the
// storefront domain via an nginx location block (see CLAUDE.md → SEO).
app.use(sitemapRoute)

app.use(notFound)
app.use(errorHandler)

connectDB()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`✓ Sonari API ready on http://localhost:${PORT}`),
    )
  })
  .catch((err) => {
    console.error('✗ Failed to start:', err.message)
    process.exit(1)
  })
