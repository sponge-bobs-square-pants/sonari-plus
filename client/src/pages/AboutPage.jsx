import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Placeholder from '../components/ui/Placeholder'
import Reveal from '../components/ui/Reveal'
import { BRAND } from '../data/brand'

/* The three things the brand holds to — kept as data so the section
   stays a clean map. */
const PRINCIPLES = [
  {
    title: 'Chosen with care',
    body: 'Every piece is here because we would wear it ourselves — selected from labels we trust, never just to fill a rack.',
  },
  {
    title: 'Fabric that disappears',
    body: 'We favour modal, organic cotton and breathable bamboo — soft, quiet fabrics you forget you have on.',
  },
  {
    title: 'Family-run',
    body: 'A small family team in Vadodara — the same people who choose the pieces answer your emails.',
  },
]

/** /about — the brand story, in its own dedicated page. */
export default function AboutPage() {
  return (
    <>
      <Header solid border={false} />

      <main className="bg-canvas">
        {/* Opening statement */}
        <section className="mx-auto max-w-3xl px-6 pb-20 pt-36 text-center">
          <Reveal>
            <p className="eyebrow text-clay">Our story</p>
            <h1 className="mt-5 font-display text-4xl font-light leading-[1.15] tracking-tight text-ink md:text-6xl">
              Rest should feel like nothing at all.
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-clay">
              {BRAND.name} is a family-run nightwear store — a considered edit of
              sleepwear and intimates, gathered from labels we trust and
              brought together in one calm place.
            </p>
          </Reveal>
        </section>

        {/* How it began — image with the founding note */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
            <Reveal className="relative">
              <Placeholder tone="rose" className="aspect-[4/5] w-full" />
              <div className="absolute -bottom-6 -right-4 hidden bg-canvas px-7 py-6 shadow-[0_22px_50px_-24px_rgba(46,42,38,0.4)] md:block">
                <p className="font-display text-4xl font-light text-ink">
                  1999
                </p>
                <p className="eyebrow mt-1 text-[0.5625rem] text-clay">
                  Family-run, since
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <p className="eyebrow text-clay">How it began</p>
              <h2 className="mt-4 font-display text-3xl font-light leading-[1.25] tracking-tight text-ink md:text-[2.5rem]">
                It began with a simple search.
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-clay">
                {BRAND.name} grew out of a familiar frustration — nightwear that
                looked lovely on the rack but never quite felt it, scattered
                across a dozen shops and a hundred browser tabs. We wanted one
                place that had already done the looking.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-clay">
                So we built it. We seek out sleepwear from brands who care how
                a fabric feels at 2am, try the pieces ourselves, and stock
                only the ones we&apos;d reach for again. The labels change —
                the standard never does.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Principles */}
        <section className="border-y border-linen">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Reveal>
              <p className="eyebrow text-clay">What we hold to</p>
            </Reveal>
            <div className="mt-10 grid gap-12 md:grid-cols-3 md:gap-10">
              {PRINCIPLES.map((p, i) => (
                <Reveal key={p.title} delay={i * 90}>
                  <p className="font-display text-2xl font-light text-dusk">
                    0{i + 1}
                  </p>
                  <h3 className="mt-4 font-display text-lg font-normal text-ink">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-clay">
                    {p.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="mx-auto max-w-xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-light tracking-tight text-ink">
              Made for how you actually sleep.
            </h2>
            <div className="mt-8">
              <Button as={Link} to="/shop" variant="solid">
                Explore the collection
              </Button>
            </div>
          </Reveal>
        </section>
      </main>
    </>
  )
}
