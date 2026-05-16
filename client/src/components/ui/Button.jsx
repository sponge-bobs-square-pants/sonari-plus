/**
 * Sonari button — three quiet variants:
 *   solid   — filled ink, the primary action
 *   outline — hairline border, secondary action
 *   link    — underlined text, used for inline CTAs (hero, story)
 *
 * Renders as <button> by default; pass `as="a"` for links.
 */
const VARIANTS = {
  solid:
    'bg-ink text-canvas px-9 py-4 hover:bg-clay',
  outline:
    'border border-ink text-ink px-9 py-4 hover:bg-ink hover:text-canvas',
  link:
    'text-ink pb-1 border-b border-ink hover:text-clay hover:border-dusk',
  /* light — filled, for placement on dark surfaces (hero, footer) */
  light:
    'bg-canvas text-ink px-9 py-4 hover:bg-greige',
  /* outline-light — hairline outline, for dark surfaces */
  'outline-light':
    'border border-canvas/40 text-canvas px-9 py-4 hover:bg-canvas hover:text-ink',
}

export default function Button({
  variant = 'solid',
  as: Tag = 'button',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={`inline-flex items-center justify-center gap-2.5 font-body text-xs uppercase
        tracking-[0.2em] transition-colors duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]
        cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
        ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
