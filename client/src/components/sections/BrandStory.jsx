import Placeholder from '../ui/Placeholder'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'

/** Asymmetric story block — image with an overlapping caption card. */
export default function BrandStory() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-var(--header-height))] max-w-7xl flex-col justify-center px-6 py-20">
      <div className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
        <Reveal className="relative">
          <Placeholder tone="rose" className="aspect-[4/5] w-full" />
          <div className="absolute -bottom-6 -right-4 hidden bg-canvas px-7 py-6 shadow-[0_22px_50px_-24px_rgba(46,42,38,0.4)] md:block">
            <p className="font-display text-4xl font-light text-ink">2024</p>
            <p className="eyebrow mt-1 text-[0.5625rem] text-clay">
              Family-run, since
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <p className="eyebrow text-clay">Our story</p>
          <h2 className="mt-4 font-display text-3xl font-light leading-[1.25] tracking-tight text-ink md:text-[2.5rem]">
            Rest should feel like nothing at all.
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-clay">
            Sonari began with a simple frustration — sleepwear that looked
            lovely but never quite felt it. So we started again from the
            fabric: soft modal, organic cotton, breathable bamboo.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-clay">
            Every piece is cut to move with you and made in small runs, so
            nothing is rushed and nothing is wasted.
          </p>
          <div className="mt-9">
            <Button as="a" href="#" variant="link">
              Read our story
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
