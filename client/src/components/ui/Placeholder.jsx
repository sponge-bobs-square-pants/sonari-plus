/**
 * Tonal image placeholder.
 *
 * Until real product photography exists, every "image" on the site
 * is one of these — a warm multi-stop gradient + film grain + a faint
 * SONARI wordmark, so the layout reads as designed, not unfinished.
 *
 * Pass a real `src` later and it renders an <img> instead — swapping
 * placeholders for photos becomes a data change, not a redesign.
 */
const TONES = {
  light: 'linear-gradient(155deg,#f2ece1 0%,#e2d8c7 55%,#cdc0aa 100%)',
  mid: 'linear-gradient(155deg,#ddd2bf 0%,#c4b6a0 60%,#a99a83 100%)',
  rose: 'linear-gradient(155deg,#d9cabf 0%,#bda69d 58%,#9c8279 100%)',
  deep: 'linear-gradient(160deg,#6f6555 0%,#453f39 68%,#2b2823 100%)',
}

export default function Placeholder({
  tone = 'mid',
  src,
  alt = '',
  mark = true,
  className = '',
  children,
}) {
  return (
    <div
      className={`relative overflow-hidden bg-linen ${className}`}
      style={src ? undefined : { backgroundImage: TONES[tone] }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          {/* soft top-left light source for depth */}
          <div className="absolute -inset-1/4 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.4),transparent_62%)]" />
          <div className="grain absolute inset-0 opacity-55" />
          {mark && (
            <span className="pointer-events-none absolute inset-0 flex select-none items-center justify-center font-display font-light tracking-[0.5em] text-ink/[0.07] text-[clamp(0.9rem,3.5vw,2rem)]">
              SONARI
            </span>
          )}
        </>
      )}
      {children}
    </div>
  )
}
