import { Router } from 'express'
import Product from '../models/Product.js'

/**
 * Server-side mirror of client/src/utils/slug.js → slugify().
 * Two copies because the server has no client dep; if the rule ever
 * changes (e.g. allowing a different alphabet), update both.
 */
function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const productPath = (p) => {
  const slug = slugify(p?.name)
  return slug ? `/product/${slug}-${p._id}` : `/product/${p._id}`
}

/**
 * GET /sitemap.xml — the LIVE sitemap, listing every product alongside the
 * marketing routes. The static file at client/public/sitemap.xml is a
 * fallback for the case where the host nginx isn't proxying this route to
 * the backend yet; once the proxy block is in place this version takes
 * over and product URLs flow into Google automatically.
 *
 * Mounted at the root (NOT under /api) because crawlers fetch sitemaps
 * from "well-known" paths and Google's submission UI expects /sitemap.xml.
 *
 * Scale: the sitemaps protocol caps a single file at 50,000 URLs and 50MB.
 * If the catalogue ever crosses that, split this into a sitemap-index +
 * /sitemap-products-N.xml shards.
 */

// Customer-facing base URL — kept in sync with what the storefront uses
// to build customer links (PUBLIC_SITE_URL is the same env used by the
// email templates). Trailing slash is stripped to keep <loc> tidy.
const baseUrl = () =>
  (process.env.PUBLIC_SITE_URL || 'https://www.nuit.in').replace(/\/+$/, '')

// Hand-curated marketing routes — kept here (not imported from the
// frontend) so the backend has no client-side dependency. If you add a
// new top-level content page on the storefront, add it here too.
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/shop', changefreq: 'daily', priority: '0.9' },
  { path: '/shop?category=nightwear', changefreq: 'weekly', priority: '0.8' },
  { path: '/shop?category=nightdresses', changefreq: 'weekly', priority: '0.8' },
  { path: '/shop?category=bras', changefreq: 'weekly', priority: '0.8' },
  { path: '/shop?category=panties', changefreq: 'weekly', priority: '0.8' },
  { path: '/shop?category=kids', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/refund', changefreq: 'yearly', priority: '0.3' },
]

// XML-escape any value that could show up inside an element. `<loc>`
// values can contain `&` (query strings: `?category=x&size=M`) which
// MUST be escaped per the sitemaps spec or Google rejects the file.
const xmlEscape = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const urlNode = ({ loc, lastmod, changefreq, priority }) => {
  const parts = [`    <loc>${xmlEscape(loc)}</loc>`]
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`)
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`)
  if (priority) parts.push(`    <priority>${priority}</priority>`)
  return `  <url>\n${parts.join('\n')}\n  </url>`
}

const router = Router()

router.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const site = baseUrl()
    // Limit defensively against the 50k spec cap. Newest first so the
    // freshest catalogue makes it in even if we ever exceed it.
    // `name` is required so the slug can be built; `updatedAt` becomes
    // the per-URL <lastmod>. Sorted newest first so the freshest products
    // make the cut if the catalogue ever brushes the 50k spec ceiling.
    const products = await Product.find({}, '_id name updatedAt')
      .sort({ updatedAt: -1 })
      .limit(49000)

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const urls = [
      ...STATIC_ROUTES.map((r) => ({
        loc: `${site}${r.path}`,
        lastmod: today,
        changefreq: r.changefreq,
        priority: r.priority,
      })),
      ...products.map((p) => ({
        loc: `${site}${productPath(p)}`,
        lastmod: (p.updatedAt || new Date()).toISOString().slice(0, 10),
        changefreq: 'weekly',
        priority: '0.7',
      })),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(urlNode).join('\n')}
</urlset>
`
    // Short cache so a new product appears within minutes of being added,
    // without hammering the DB on every crawler request. application/xml
    // is the recommended Content-Type for sitemaps.
    res.set('Content-Type', 'application/xml; charset=utf-8')
    res.set('Cache-Control', 'public, max-age=300') // 5 min
    res.send(xml)
  } catch (err) {
    next(err)
  }
})

export default router
