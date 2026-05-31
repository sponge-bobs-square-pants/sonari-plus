#!/usr/bin/env node
/**
 * Build-time sitemap generator — runs as `postbuild` after `vite build`,
 * overwriting `dist/sitemap.xml` (the static fallback Vite copied from
 * `public/`) with a fresh version that includes every product currently
 * live on the production API.
 *
 * Why postbuild not prebuild: Vite copies `public/*` to `dist/*` during
 * the build. Running afterwards means our fresh file wins. And if this
 * generator THROWS (API down, network glitch), the static fallback from
 * `public/sitemap.xml` is still in `dist/` — the build never fails on
 * sitemap unavailability.
 *
 * Stays manually in sync with:
 *   - client/src/utils/slug.js (the SPA's slugify rule)
 *   - server/src/routes/sitemap.js (the backend's dynamic sitemap)
 * Three copies, all small; any change to the rule needs all three.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = process.env.SITEMAP_SITE_URL || 'https://www.nuit.in'
const API = process.env.SITEMAP_API_BASE || 'https://backend.nuit.in/api'
const MAX_URLS = 49_000 // defensive — sitemaps spec ceiling is 50k

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

const xmlEscape = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/**
 * Walk through every page of the public catalogue until exhausted (or
 * we hit the spec cap). The API caps `limit` at 60 per page, so a
 * catalogue of N products takes ⌈N/60⌉ round trips — fast enough.
 */
async function fetchAllProducts() {
  const all = []
  let page = 1
  const limit = 60
  while (all.length < MAX_URLS) {
    const res = await fetch(`${API}/products?page=${page}&limit=${limit}`)
    if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`)
    const { products = [], hasMore } = await res.json()
    all.push(...products)
    if (!hasMore || products.length === 0) break
    page += 1
  }
  return all.slice(0, MAX_URLS)
}

function buildXml(products) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    ...STATIC_ROUTES.map((r) => ({
      loc: `${SITE}${r.path}`,
      lastmod: today,
      changefreq: r.changefreq,
      priority: r.priority,
    })),
    ...products.map((p) => ({
      loc: `${SITE}${productPath(p)}`,
      lastmod: (p.updatedAt
        ? new Date(p.updatedAt)
        : new Date()
      ).toISOString().slice(0, 10),
      changefreq: 'weekly',
      priority: '0.7',
    })),
  ]
  const body = urls
    .map(
      ({ loc, lastmod, changefreq, priority }) =>
        `  <url>\n` +
        `    <loc>${xmlEscape(loc)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>${changefreq}</changefreq>\n` +
        `    <priority>${priority}</priority>\n` +
        `  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const distDir = join(here, '..', 'dist')
  const outPath = join(distDir, 'sitemap.xml')

  // A missing dist/ means vite build didn't run — bail gracefully so the
  // dev never gets a confusing "no such file" while iterating.
  if (!existsSync(distDir)) {
    console.warn(
      '! dist/ not found — skip sitemap generation (run after `vite build`).',
    )
    return
  }

  try {
    const products = await fetchAllProducts()
    mkdirSync(distDir, { recursive: true })
    writeFileSync(outPath, buildXml(products), 'utf8')
    console.log(
      `✓ sitemap.xml written with ${STATIC_ROUTES.length} static routes + ${products.length} products`,
    )
  } catch (err) {
    // Non-fatal: dist/sitemap.xml already has the static fallback (Vite
    // copied it from public/sitemap.xml). The build stays green.
    console.warn(
      `! sitemap generation skipped (${err.message}) — static fallback in dist/sitemap.xml is in place.`,
    )
  }
}

main()
