import Header from './Header'
import Reveal from '../ui/Reveal'

/**
 * Shared shell for the legal / policy pages (Privacy, Terms, Refund).
 *
 * Props:
 *   title    — the page heading
 *   updated  — a "last updated" date string
 *   intro    — optional lead paragraph
 *   sections — array of { heading, body }, where `body` is a list of
 *              strings (paragraphs) and/or { list: [...] } objects.
 */
export default function PolicyLayout({ title, updated, intro, sections }) {
  return (
    <>
      <Header solid border={false} />

      <main className="min-h-screen bg-canvas px-6 pb-24 pt-32">
        <div className="mx-auto max-w-3xl">
          <Reveal instantInView>
            <p className="eyebrow text-clay">Legal</p>
            <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-ink md:text-5xl">
              {title}
            </h1>
            <p className="eyebrow mt-4 text-[0.625rem] text-clay">
              Last updated · {updated}
            </p>
            {intro && (
              <p className="mt-8 text-sm leading-relaxed text-clay">{intro}</p>
            )}
          </Reveal>

          <div className="mt-14 space-y-11">
            {sections.map((section) => (
              <Reveal key={section.heading} instantInView>
                <section>
                  <h2 className="font-display text-xl font-normal text-ink">
                    {section.heading}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {section.body.map((block, i) =>
                      typeof block === 'string' ? (
                        <p
                          key={i}
                          className="text-sm leading-relaxed text-clay"
                        >
                          {block}
                        </p>
                      ) : (
                        <ul key={i} className="space-y-2">
                          {block.list.map((item) => (
                            <li
                              key={item}
                              className="flex gap-3 text-sm leading-relaxed text-clay"
                            >
                              <span
                                aria-hidden="true"
                                className="mt-2.5 h-px w-3.5 shrink-0 bg-greige"
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ),
                    )}
                  </div>
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
