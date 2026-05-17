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
  return (
    <>
      <Header announcement />
      <main>
        <Hero />
        <CategoryGallery />
        <NewArrivals />
        <ValueProps />
        <Newsletter />
      </main>
      <Footer />
    </>
  )
}
