import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import { useDocumentMeta } from '../utils/useDocumentMeta'

/**
 * /journal — placeholder until we have stories to publish.
 *
 * Designed to feel intentional rather than "coming soon" web-page filler.
 * Layout mirrors the calm, image-led editorial direction: generous
 * whitespace, eyebrow + display headline + body, gentle CTA back into the
 * collection. When a real Journal section exists (CMS-fed or hardcoded
 * articles), replace this page entirely — the route stays the same.
 */
export default function JournalPage() {
  useDocumentMeta({
    title: 'Journal — nuit',
    description:
      'Notes from nuit on the pieces, the partners, and the quiet hours. Stories soon.',
  })

  return (
    <>
      <Header solid border={false} />

      <main className="flex min-h-screen items-center bg-canvas px-6 pb-24 pt-32">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow text-clay">Journal</p>
          <h1 className="mt-5 font-display text-4xl font-light leading-[1.1] tracking-tight text-ink md:text-5xl">
            Stories, soon.
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-clay">
            We're putting the early issues together — notes on the partners
            we work with, the fabrics that shape each season, and short
            essays on the quieter rhythms of sleep, rest, and time at home.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-clay">
            Until then, the pieces speak for themselves.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-x-9 gap-y-4">
            <Button as={Link} to="/shop" variant="solid">
              Browse the collection
            </Button>
            <Link
              to="/about"
              className="eyebrow text-clay transition-colors hover:text-ink"
            >
              About nuit →
            </Link>
          </div>

          {/* Quiet hairline + signature */}
          <div className="mt-20 border-t border-linen pt-8">
            <p className="eyebrow text-[0.625rem] text-clay">
              The nuit team
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
