import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProducts } from '../../services/productApi'
import ProductCard from '../product/ProductCard'
import Placeholder from '../ui/Placeholder'
import Reveal from '../ui/Reveal'

const PLACEHOLDER_TONES = ['rose', 'light', 'mid', 'deep']

/**
 * Shown when no products are tagged "New" yet — keeps the section
 * present and designed without inventing fake clickable products.
 */
function PlaceholderCard({ tone }) {
  return (
    <div>
      <Placeholder tone={tone} className="aspect-[3/4] w-full" />
      <p className="eyebrow mt-4 text-[0.5625rem] text-clay">Coming soon</p>
    </div>
  )
}

/**
 * "New this week" — products tagged "New" (newest first, up to four).
 * The section is ALWAYS present; with no tagged products it falls back
 * to tonal placeholder cards so the landing page never has a hole.
 */
export default function NewArrivals() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    // Server-side: newest four products tagged "New".
    listProducts({ tag: 'New', sort: 'newest', limit: 4 })
      .then((res) => setProducts(res.products))
      .catch(() => {})
  }, [])

  const hasProducts = products.length > 0

  return (
    <section
      id="new"
      data-nav-surface="oat"
      className="flex min-h-screen snap-start snap-always items-center bg-oat pt-[var(--header-height)]"
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-20">
        <Reveal className="mb-12 flex items-end justify-between">
          <div>
            <p className="eyebrow text-clay">New this week</p>
            <h2 className="mt-3 font-display text-3xl font-light tracking-tight text-ink md:text-4xl">
              Just arrived
            </h2>
          </div>
          <Link
            to="/shop"
            className="eyebrow text-clay transition-colors hover:text-ink"
          >
            View all →
          </Link>
        </Reveal>

        <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4">
          {hasProducts
            ? products.map((product, i) => (
                <Reveal key={product._id} delay={i * 90}>
                  <ProductCard product={product} featured />
                </Reveal>
              ))
            : PLACEHOLDER_TONES.map((tone, i) => (
                <Reveal key={tone} delay={i * 90}>
                  <PlaceholderCard tone={tone} />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  )
}
