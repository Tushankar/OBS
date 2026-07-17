// Decorative dashed "travel route" doodle — used sparingly (two sections on
// the home page). Purely cosmetic: aria-hidden, never intercepts clicks, and
// content in normal flow paints above it. `flip` mirrors the curve.
export default function RouteLines({ flip = false, className = '' }) {
  return (
    <svg
      viewBox="0 0 1400 420"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 h-full w-full text-[#D7D7D7] ${flip ? '-scale-x-100' : ''} ${className}`}
    >
      <path
        d="M-40 330 C 240 120, 480 400, 760 210 S 1200 280, 1460 90"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="7 9"
        strokeLinecap="round"
      />
      <path
        d="M-40 120 C 320 260, 620 40, 940 190 S 1300 60, 1460 210"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 10"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="760" cy="210" r="4" fill="currentColor" opacity="0.7" />
      <circle cx="940" cy="190" r="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
