import { useEffect } from 'react'

/**
 * Update <head> tags imperatively for the duration of this component's
 * mount. On unmount, the previous values are restored — so each page
 * cleanly hands the head back to whatever renders next (the index.html
 * defaults if nothing else takes over).
 *
 * Covers: <title>, <meta name="description">, plus the matching Open
 * Graph / Twitter card tags so Google AND any JS-aware crawler see the
 * per-page values. Non-JS social crawlers (Facebook, WhatsApp,
 * LinkedIn) still see the brand-level defaults from index.html — that
 * limitation is solvable only with SSR.
 *
 * Usage:
 *   useDocumentMeta({
 *     title: 'Long Cotton Nightdress — Sonari | nuit',
 *     description: 'Soft cotton…',
 *     url: 'https://www.nuit.in/product/long-cotton-nightdress-abc123',
 *     image: 'https://res.cloudinary.com/.../hero.jpg',
 *   })
 *
 * Empty/undefined values are skipped — no tag is created or cleared.
 */
export function useDocumentMeta({ title, description, url, image } = {}) {
  useEffect(() => {
    // Capture the head state we're about to touch so unmount can put it
    // back exactly as we found it.
    const before = {
      title: document.title,
      description: readContent('meta[name="description"]'),
      ogTitle: readContent('meta[property="og:title"]'),
      ogDescription: readContent('meta[property="og:description"]'),
      ogUrl: readContent('meta[property="og:url"]'),
      ogImage: readContent('meta[property="og:image"]'),
      twitterTitle: readContent('meta[name="twitter:title"]'),
      twitterDescription: readContent('meta[name="twitter:description"]'),
      twitterImage: readContent('meta[name="twitter:image"]'),
    }

    if (title) {
      document.title = title
      writeContent('meta[property="og:title"]', title)
      writeContent('meta[name="twitter:title"]', title)
    }
    if (description) {
      writeContent('meta[name="description"]', description)
      writeContent('meta[property="og:description"]', description)
      writeContent('meta[name="twitter:description"]', description)
    }
    if (url) {
      writeContent('meta[property="og:url"]', url)
    }
    if (image) {
      writeContent('meta[property="og:image"]', image)
      writeContent('meta[name="twitter:image"]', image)
    }

    return () => {
      document.title = before.title
      restoreContent('meta[name="description"]', before.description)
      restoreContent('meta[property="og:title"]', before.ogTitle)
      restoreContent('meta[property="og:description"]', before.ogDescription)
      restoreContent('meta[property="og:url"]', before.ogUrl)
      restoreContent('meta[property="og:image"]', before.ogImage)
      restoreContent('meta[name="twitter:title"]', before.twitterTitle)
      restoreContent(
        'meta[name="twitter:description"]',
        before.twitterDescription,
      )
      restoreContent('meta[name="twitter:image"]', before.twitterImage)
    }
  }, [title, description, url, image])
}

function readContent(selector) {
  return document.head.querySelector(selector)?.getAttribute('content') ?? null
}

/** Set or create the meta tag for `selector` with the given `content`. */
function writeContent(selector, content) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    // selector is one of meta[name="X"] or meta[property="Y"] — pull
    // out the attribute name + value and stamp it onto the new node.
    const match = selector.match(/^meta\[(name|property)="([^"]+)"\]$/)
    if (match) el.setAttribute(match[1], match[2])
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Put a captured value back; remove if it didn't exist before. */
function restoreContent(selector, previous) {
  const el = document.head.querySelector(selector)
  if (!el) return
  if (previous == null) el.parentNode?.removeChild(el)
  else el.setAttribute('content', previous)
}
