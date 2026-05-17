import { useEffect, useState } from 'react'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import Hero from '../components/sections/Hero'
import CategoryGallery from '../components/sections/CategoryGallery'
import NewArrivals from '../components/sections/NewArrivals'
import ValueProps from '../components/sections/ValueProps'
import Newsletter from '../components/sections/Newsletter'

/**
 * Sonari Nightwear — homepage.
 * Composed entirely from kit components; the section order is the
 * "Quiet Gallery" conversion rhythm: hook → orient → tempt →
 * reassure → capture. The brand story now lives on its own /about page.
 */
export default function LandingPage() {
  // The solid navbar's colour follows the section currently in view.
  const [navSurface, setNavSurface] = useState('canvas')

  // Snap the full-screen sections into view — landing page only; the
  // <html> class is dropped on leave.
  useEffect(() => {
    document.documentElement.classList.add('snap-screens')
    return () => document.documentElement.classList.remove('snap-screens')
  }, [])

  // Match the navbar to whichever section sits behind it — an observer
  // tracks the most-visible `[data-nav-surface]` section.
  useEffect(() => {
    const sections = document.querySelectorAll('[data-nav-surface]')
    if (!sections.length) return
    const ratios = new Map()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio)
        let best = null
        let bestRatio = 0
        for (const [el, r] of ratios) {
          if (r > bestRatio) {
            bestRatio = r
            best = el
          }
        }
        if (best) setNavSurface(best.dataset.navSurface)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <Header announcement border={false} surface={navSurface} />
      <main>
        <Hero />
        <CategoryGallery />
        <NewArrivals />
        {/* Closing screen — newsletter, the value-props band and footer
            merged into one full-height snap section. The value-props band
            flex-grows to fill whatever space is left, so the last scroll
            lands on the whole thing with no padded-out gaps. */}
        <section
          data-nav-surface="oat"
          className="flex min-h-screen snap-start snap-always flex-col"
        >
          <Newsletter />
          <ValueProps />
          <Footer />
        </section>
      </main>
    </>
  )
}
