import { useState } from 'react'
import Header from '../components/layout/Header'
import Placeholder from '../components/ui/Placeholder'
import { useDocumentMeta } from '../utils/useDocumentMeta'

/*
 ┌─────────────────────────────────────────────────────────────────────┐
 │ ADD SIZE-CHART IMAGES HERE                                          │
 │                                                                     │
 │ Drop your size chart JPGs/PNGs into                                 │
 │   client/src/assets/size-guide/                                     │
 │ (create the folder if it doesn't exist).                            │
 │                                                                     │
 │ Then uncomment the matching import below and set the `image:` on    │
 │ each CATEGORIES entry. Categories without an `image` render the     │
 │ brand Placeholder, so you can ship the page partial.                │
 └─────────────────────────────────────────────────────────────────────┘
*/
import cordsetChart from '../assets/size-guide/cordset.png'
import nightwearChart from '../assets/size-guide/nightdress.png'
import brasChart from '../assets/size-guide/bra.png'
import pantiesChart from '../assets/size-guide/panties.png'
import kidsChart from '../assets/size-guide/kids.png'

/**
 * Size guide content. One row per shop category. Each row carries:
 *   - id          → matches the URL hash + tab key
 *   - label       → tab text (kept short — typographic nav, not buttons)
 *   - intro       → 1–2 sentence framing for the category
 *   - measurements → array of { label, instruction } rows displayed as a
 *     small "how to measure" list. Tape-measure language only — keep the
 *     copy plain and instructive, not editorialised.
 *   - note        → short fit-advice line shown below the measurements
 *   - image       → the size-chart image (null → brand Placeholder)
 */
const CATEGORIES = [
  {
    id: 'cordset',
    label: 'Cordset',
    intro:
      'Soft cotton sets, cut to lounge. The fit runs natural — true to your everyday size in the chart below.',
    measurements: [
      {
        label: 'Bust',
        instruction:
          'Measure around the fullest part of your bust, keeping the tape level and relaxed.',
      },
      {
        label: 'Waist',
        instruction:
          'Measure around the narrowest part of your natural waist (just above the navel).',
      },
      {
        label: 'Hip',
        instruction:
          'Measure around the fullest part of your hips, about 20cm below the waist.',
      },
    ],
    note: 'Between sizes? Cordsets run a touch relaxed — most prefer their natural size.',
    image: cordsetChart,
    sizes: [
      {
        caption: 'Measurements in inches.',
        headers: ['Size', 'Bust', 'Waist', 'Hip'],
        rows: [
          ['XS', '32–33', '24–25', '34–35'],
          ['S', '34–35', '26–27', '36–37'],
          ['M', '36–37', '28–29', '38–39'],
          ['L', '38–40', '30–32', '40–42'],
          ['XL', '41–43', '33–35', '43–45'],
          ['2XL', '44–46', '36–38', '46–48'],
          ['3XL', '47–49', '39–41', '49–51'],
          ['4XL', '50–52', '42–44', '52–54'],
          ['5XL', '53–55', '45–47', '55–57'],
          ['6XL', '56–58', '48–50', '58–60'],
        ],
      },
    ],
  },
  {
    id: 'nightwear',
    label: 'Night wear',
    intro:
      'Long, short, and in between. The cuts breathe — choose your everyday size.',
    measurements: [
      {
        label: 'Bust',
        instruction:
          'Measure around the fullest part of your bust, tape level, no slack.',
      },
      {
        label: 'Length',
        instruction:
          'For a longer dress, measure from your shoulder seam down to where you want the hem.',
      },
    ],
    note: 'Nightdresses are forgiving by design — stay true to size unless you want a notably loose drape.',
    image: nightwearChart,
    sizes: [
      {
        caption: 'Measurements in inches.',
        headers: ['Size', 'Bust', 'Length'],
        rows: [
          ['XS', '32–33', '38'],
          ['S', '34–35', '39'],
          ['M', '36–37', '40'],
          ['L', '38–40', '41'],
          ['XL', '41–43', '42'],
          ['2XL', '44–46', '43'],
          ['3XL', '47–49', '44'],
          ['4XL', '50–52', '45'],
          ['5XL', '53–55', '46'],
          ['6XL', '56–58', '47'],
        ],
      },
    ],
  },
  {
    id: 'bras',
    label: 'Bras',
    intro:
      'Two measurements set your bra size: your band (the snug measure just under your bust) and your cup (the difference between your bust and band).',
    measurements: [
      {
        label: 'Band (underbust)',
        instruction:
          'Measure snugly just under your bust where the band sits. Round to the nearest even number.',
      },
      {
        label: 'Bust',
        instruction:
          'Measure around the fullest part of your bust, tape level.',
      },
      {
        label: 'Cup',
        instruction:
          'Subtract band from bust. 1 in → A, 2 in → B, 3 in → C, 4 in → D, 5 in → DD, 6 in → E, 7 in → F, 8 in → G.',
      },
    ],
    note: 'Soft-cup bras run forgiving. Between cups? Go down a cup and up a band, or vice versa — whichever feels closer to your everyday body.',
    image: brasChart,
    sizes: [
      {
        caption: 'Find your band on the left, your cup on top — the cell is your bust in inches.',
        headers: ['Band', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G'],
        rows: [
          ['28', '26', '27', '28', '29', '30', '31', '32', '33'],
          ['30', '28', '29', '30', '31', '32', '33', '34', '35'],
          ['32', '30', '31', '32', '33', '34', '35', '36', '37'],
          ['34', '32', '33', '34', '35', '36', '37', '38', '39'],
          ['36', '34', '35', '36', '37', '38', '39', '40', '41'],
          ['38', '36', '37', '38', '39', '40', '41', '42', '43'],
          ['40', '38', '39', '40', '41', '42', '43', '44', '45'],
          ['42', '40', '41', '42', '43', '44', '45', '46', '47'],
          ['44', '42', '43', '44', '45', '46', '47', '48', '49'],
        ],
      },
    ],
  },
  {
    id: 'panties',
    label: 'Panties',
    intro:
      'Cut to sit on the hip. One measurement — clean and easy.',
    measurements: [
      {
        label: 'Hip',
        instruction:
          'Measure around the fullest part of your hips, tape level. Most customers find their hip is the only number that matters here.',
      },
    ],
    note: 'Run true to size. If your waist and hip fall on either side of a size, choose by hip.',
    image: pantiesChart,
    sizes: [
      {
        caption: 'Measurements in inches.',
        headers: ['Size', 'Hip'],
        rows: [
          ['XS', '34–35'],
          ['S', '36–37'],
          ['M', '38–39'],
          ['L', '40–42'],
          ['XL', '43–45'],
          ['2XL', '46–48'],
          ['3XL', '49–51'],
          ['4XL', '52–54'],
          ['5XL', '55–57'],
          ['6XL', '58–60'],
        ],
      },
    ],
  },
  {
    id: 'kids',
    label: 'Kids',
    intro:
      'Sized by age and height. Children grow fast — when in doubt, size up.',
    measurements: [
      {
        label: 'Height',
        instruction: 'Stand the child against a wall, measure to the top of the head, shoes off.',
      },
      {
        label: 'Chest',
        instruction: 'Measure around the fullest part of the chest, arms relaxed at the sides.',
      },
    ],
    note: 'Kids pieces have generous seams so they last a season longer. If between sizes, size up.',
    image: kidsChart,
    sizes: [
      {
        caption: 'Measurements in inches.',
        headers: ['Size', 'Age', 'Height', 'Chest'],
        rows: [
          ['4', '3–4', '38–40', '22'],
          ['6', '5–6', '41–44', '23'],
          ['8', '7–8', '45–48', '24'],
          ['10', '9–10', '49–52', '26'],
          ['12', '11–12', '53–56', '28'],
          ['14', '13–14', '57–60', '30'],
          ['16', '15+', '61–64', '32'],
          ['18', '16+', '65–66', '34'],
          ['20', '17+', '66–68', '36'],
          ['22', '—', '—', '38'],
          ['24', '—', '—', '40'],
        ],
      },
    ],
  },
]

/**
 * /size-guide — single-page reference with a typographic tab nav.
 * No footer (per project convention — inner pages end at content).
 */
export default function SizeGuidePage() {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id)
  const active = CATEGORIES.find((c) => c.id === activeId) || CATEGORIES[0]

  useDocumentMeta({
    title: 'Size guide — nuit',
    description:
      'How to measure and choose your size in cordsets, night wear, bras, panties and kids — at nuit.',
  })

  return (
    <>
      <Header solid border={false} />

      <main className="min-h-screen bg-canvas px-6 pb-12 pt-24">
        <div className="mx-auto max-w-6xl">
          {/* ── Title block ── */}
          <h1 className="font-display text-3xl font-light tracking-tight text-ink md:text-4xl">
            Find your fit.
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-clay">
            A tape measure, a minute, and you'll know your size for every
            piece. Pick a category below.
          </p>

          {/* ── Typographic tab nav — underline-on-active ── */}
          <nav
            aria-label="Size guide categories"
            className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-b border-linen pb-3"
          >
            {CATEGORIES.map((cat) => {
              const isActive = cat.id === activeId
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveId(cat.id)}
                  className={`eyebrow relative pb-1.5 cursor-pointer text-[0.6875rem] transition-colors ${
                    isActive ? 'text-ink' : 'text-clay hover:text-ink'
                  }`}
                >
                  {cat.label}
                  {/* Active underline replaces a slice of the nav's hairline. */}
                  <span
                    aria-hidden
                    className={`absolute -bottom-[0.8rem] left-0 right-0 h-px transition-colors ${
                      isActive ? 'bg-ink' : 'bg-transparent'
                    }`}
                  />
                </button>
              )
            })}
          </nav>

          {/* ── Active category content — three-column on desktop
              (text · diagram · table) so it fits a single viewport. ── */}
          <article className="mt-8 grid gap-8 md:grid-cols-[1fr_1fr_1.1fr] md:gap-10">
            {/* Col 1 — intro + how-to-measure + note */}
            <div>
              <p className="text-sm leading-relaxed text-ink">{active.intro}</p>

              <p className="eyebrow mt-5 text-[0.625rem] text-clay">
                How to measure
              </p>
              <ul className="mt-2 space-y-3">
                {active.measurements.map((m) => (
                  <li key={m.label} className="border-l border-linen pl-3">
                    <p className="font-display text-xs font-normal text-ink">
                      {m.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-clay">
                      {m.instruction}
                    </p>
                  </li>
                ))}
              </ul>

              {active.note && (
                <p className="mt-5 text-xs leading-relaxed text-clay">
                  <span className="eyebrow mr-2 text-[0.625rem] text-dusk">
                    Note —
                  </span>
                  {active.note}
                </p>
              )}
            </div>

            {/* Col 2 — chart diagram */}
            <figure>
              {active.image ? (
                <img
                  src={active.image}
                  alt={`${active.label} size chart`}
                  className="block w-full"
                />
              ) : (
                <Placeholder
                  tone="mid"
                  mark={false}
                  className="aspect-[3/4] w-full"
                />
              )}
            </figure>

            {/* Col 3 — size table(s) (HTML, crisp + selectable).
                Categories with multiple tables (Bras, Kids) stack them
                with a small gap between. */}
            {active.sizes?.length ? (
              <div className="space-y-6">
                {active.sizes.map((tbl, ti) => (
                  <div key={ti}>
                    <p className="eyebrow text-[0.625rem] text-clay">
                      {tbl.caption || 'Measurements'}
                    </p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-linen">
                            {tbl.headers.map((h, i) => (
                              <th
                                key={h}
                                scope="col"
                                className={`eyebrow py-2 text-[0.5625rem] text-clay ${
                                  i === 0 ? 'pl-0 pr-3' : 'px-3'
                                }`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tbl.rows.map((row, ri) => (
                            <tr
                              key={ri}
                              className="border-b border-linen/60 last:border-b-0"
                            >
                              {row.map((cell, ci) => (
                                <td
                                  key={ci}
                                  className={`py-2 text-xs tabular-nums ${
                                    ci === 0
                                      ? 'pl-0 pr-3 font-display text-ink'
                                      : 'px-3 text-clay'
                                  }`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div />
            )}
          </article>

          {/* ── Closing note — compact ── */}
          <p className="mt-8 border-t border-linen pt-5 text-xs leading-relaxed text-clay">
            <span className="eyebrow mr-2 text-[0.625rem] text-clay">
              A note on fit —
            </span>
            All charts are in inches (1 in ≈ 2.54 cm). Still unsure? Write
            to us at{' '}
            <a
              href="mailto:support@nuit.in"
              className="text-ink underline underline-offset-2 transition-colors hover:text-clay"
            >
              support@nuit.in
            </a>{' '}
            with the piece you're looking at — we'll help you choose.
          </p>
        </div>
      </main>
    </>
  )
}
