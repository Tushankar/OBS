// Infinite horizontal marquee (JSX port of the shadcn-style marquee).
// Children are rendered twice; the track animates -50% and loops seamlessly.
// `speed` = seconds per loop, `direction` left|right, `pauseOnHover` stops the
// scroll while the pointer is over it, `fadeColor` draws soft edge masks.
export default function Marquee({
  children,
  pauseOnHover = true,
  direction = 'left',
  speed = 30,
  fadeColor = '#F5F5F5',
  fadeWidthClass = 'w-16 sm:w-24', // narrower for small content (e.g. chips)
  className = '',
}) {
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div className="relative flex overflow-hidden py-2">
        {/* Layout-critical sizing is inline: the track MUST be max-content wide
            (2× one copy) or the copies get squeezed and their tail chips spill
            under the next copy (seen as overlapping pills). */}
        <div
          className={`animate-marquee ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''} ${direction === 'right' ? 'animate-marquee-reverse' : ''}`}
          style={{ display: 'flex', width: 'max-content', minWidth: 'max-content', flexShrink: 0, '--duration': `${speed}s` }}
        >
          {children}
          {children}
        </div>
      </div>
      {/* Edge fades so logos glide in/out instead of hard-clipping */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 ${fadeWidthClass}`} style={{ background: `linear-gradient(to right, ${fadeColor}, transparent)` }} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 ${fadeWidthClass}`} style={{ background: `linear-gradient(to left, ${fadeColor}, transparent)` }} />
    </div>
  );
}
