import Reveal from '../ui/Reveal'

const ITEMS = [
  {
    icon: 'fabric',
    title: 'Fabrics that disappear',
    text: 'TENCEL™ modal, organic cotton and bamboo — nothing tight, nothing scratchy.',
  },
  {
    icon: 'returns',
    title: 'Easy 10-day returns',
    text: 'Changed your mind? Return it within 10 days of delivery.',
  },
  {
    icon: 'secure',
    title: 'Secure, simple checkout',
    text: 'Encrypted payment and order tracking, from cart to doorstep.',
  },
]

function PropIcon({ name }) {
  const paths = {
    fabric: (
      <>
        <path d="M3 7c3-3 6-3 9 0s6 3 9 0" />
        <path d="M3 12c3-3 6-3 9 0s6 3 9 0" />
        <path d="M3 17c3-3 6-3 9 0s6 3 9 0" />
      </>
    ),
    returns: (
      <>
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v5h-5" />
      </>
    ),
    secure: (
      <>
        <path d="M12 3 5 6v5c0 5 3 8 7 9 4-1 7-4 7-9V6l-7-3Z" />
        <path d="m9.3 12 2 2 3.6-3.6" />
      </>
    ),
  }
  return (
    <svg
      className="h-7 w-7 text-ink"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

/** Quiet trust band — grows to fill the closing screen between the
    newsletter and the footer, with the value props centered inside. */
export default function ValueProps() {
  return (
    <div className="flex flex-1 items-center border-y border-linen">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-8 md:grid-cols-3 md:gap-10">
        {ITEMS.map((item, i) => (
          <Reveal
            key={item.icon}
            delay={i * 90}
            className="flex flex-col items-center text-center md:flex-row md:items-start md:gap-5 md:text-left"
          >
            <PropIcon name={item.icon} />
            <div className="mt-4 md:mt-0">
              <h3 className="font-display text-base font-normal text-ink">
                {item.title}
              </h3>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-clay">
                {item.text}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
