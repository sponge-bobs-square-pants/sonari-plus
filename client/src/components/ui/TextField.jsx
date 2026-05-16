/**
 * Underline-style text input matching the Sonari kit.
 * `dark` flips the colours for placement on the ink theme.
 * Spreads remaining props (value, onChange, name, required…) onto
 * the native <input>.
 */
export default function TextField({
  label,
  type = 'text',
  dark = false,
  className = '',
  ...props
}) {
  return (
    <label className={`block ${className}`}>
      <span
        className={`eyebrow text-[0.625rem] ${dark ? 'text-canvas/50' : 'text-clay'}`}
      >
        {label}
      </span>
      <input
        type={type}
        className={`mt-2 w-full border-b bg-transparent pb-2 text-sm transition-colors focus:outline-none ${
          dark
            ? 'border-canvas/25 text-canvas placeholder:text-canvas/35 focus:border-canvas'
            : 'border-ink/25 text-ink placeholder:text-clay/50 focus:border-ink'
        }`}
        {...props}
      />
    </label>
  )
}
