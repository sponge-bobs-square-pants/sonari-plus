const COLUMNS = [
  { title: 'Shop', items: ['Nightwear', 'Nightdresses', 'Bras', 'Panties', 'New In'] },
  { title: 'Help', items: ['Size guide', 'Delivery & returns', 'Fabric care', 'Contact us'] },
  { title: 'Sonari', items: ['Our story', 'Sustainability', 'Stockists', 'Journal'] },
]

const SOCIALS = ['Instagram', 'Pinterest', 'Facebook']

export default function Footer() {
  return (
    <footer className="bg-ink text-canvas">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-14 md:grid-cols-[1.4fr_2fr]">
          {/* Brand */}
          <div>
            <p className="font-display text-3xl font-light tracking-[0.3em] pl-[0.3em]">
              SONARI
            </p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-canvas/55">
              Modal and cotton sleepwear, nightdresses and intimates — made
              for how you actually sleep.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="eyebrow text-[0.625rem] text-dusk">{col.title}</h4>
                <ul className="mt-5 space-y-3">
                  {col.items.map((item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-canvas/65 transition-colors hover:text-canvas"
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Lower bar */}
        <div className="mt-16 flex flex-col gap-5 border-t border-canvas/12 pt-8 text-xs text-canvas/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Sonari Nightwear. All rights reserved.</p>
          <ul className="flex gap-6">
            {SOCIALS.map((s) => (
              <li key={s}>
                <a
                  href="#"
                  className="uppercase tracking-[0.14em] transition-colors hover:text-canvas"
                >
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
