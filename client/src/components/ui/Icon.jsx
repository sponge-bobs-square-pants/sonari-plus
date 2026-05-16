/**
 * Shared hairline-stroke icon set. Icons inherit `currentColor`, so
 * they flip between canvas/ink with whatever surface they sit on.
 */
const PATHS = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.3-4.3" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.3-9.2-9C1.4 8 3 4.5 6.4 4.5c2 0 3.5 1.2 4.6 3 1.1-1.8 2.6-3 4.6-3 3.4 0 5 3.5 3.6 6.5C19 15.7 12 20 12 20Z" />
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  menu: (
    <>
      <path d="M3 8h18" />
      <path d="M3 16h18" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  box: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  layout: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1" />
      <path d="M3.5 9.5h17" />
    </>
  ),
  close: (
    <>
      <path d="M5 5l14 14" />
      <path d="M19 5 5 19" />
    </>
  ),
  filter: <path d="M4 6h16l-6 7v6l-4-2v-4L4 6Z" />,
}

export default function Icon({ name, className = 'h-[26px] w-[26px]' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  )
}
