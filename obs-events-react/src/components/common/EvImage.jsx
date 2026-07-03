import { paletteFor, initials } from '../../data/events';

/**
 * Image with an instant gradient + initials fallback painted behind it.
 * The <img> fades in on load and hides itself on error, so the layout is
 * never blank and never broken — even offline.
 */
export default function EvImage({ seed = 0, url, label = '', wmSize = 0, className = '', rounded = '', bgClass = '' }) {
  const [c1, c2] = paletteFor(seed);
  const wm = label ? initials(label) : '';
  return (
    <div className={`absolute inset-0 overflow-hidden ${rounded} ${className}`}>
      <div
        className={`absolute inset-0 flex items-center justify-center ${bgClass}`}
        style={bgClass ? {} : { backgroundImage: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}
      >
        {wm && (
          <span
            className="font-extrabold select-none"
            style={{ fontSize: wmSize, color: `rgba(255,255,255,${wmSize > 40 ? 0.24 : 0.5})` }}
          >
            {wm}
          </span>
        )}
      </div>
      {url && (
        <img
          src={url}
          alt={label}
          loading="lazy"
          onLoad={(e) => (e.currentTarget.style.opacity = 1)}
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300"
        />
      )}
    </div>
  );
}
