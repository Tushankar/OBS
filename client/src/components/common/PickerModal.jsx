import { useEffect } from 'react';
import { Icon } from './Icon';
import { ChapterFlag } from './ChapterMark';

// A professional modal picker used for the display-currency and country
// selectors in the header (replaces the old dropdowns). Backdrop + Esc close;
// the current value is highlighted with a check. Options may carry a
// `flagCode` (ISO-2) to render a real flag, and `wide` blows the dialog up
// to a large 3-column layout.
export default function PickerModal({ open, onClose, title, subtitle, options, value, onSelect, columns = 1, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[12vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_60px_rgba(0,0,0,.25)] ${wide ? 'max-w-3xl' : 'max-w-md'}`}
        style={{ animation: 'pickerIn .18s ease-out' }}
      >
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12px] text-ink-mute">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-mute transition hover:bg-surface hover:text-ink">
            <Icon.Close width={18} height={18} />
          </button>
        </div>

        <div className={`overflow-y-auto p-3 ${wide ? 'max-h-[64vh] grid grid-cols-2 gap-2 sm:grid-cols-3' : columns === 2 ? 'max-h-[52vh] grid grid-cols-2 gap-2' : 'max-h-[52vh] flex flex-col gap-1'}`}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                onClick={() => { onSelect(o.value); onClose(); }}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition ${active ? 'border-brand bg-brand-soft' : 'border-transparent hover:border-line hover:bg-surface'}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {o.flagCode && <ChapterFlag code={o.flagCode} className="h-[18px] w-[26px] shrink-0 rounded-[3px] shadow-sm" />}
                  {o.emoji && <span className="shrink-0 text-base leading-none">{o.emoji}</span>}
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${active ? 'text-brand' : 'text-ink'}`}>{o.label}</span>
                    {o.hint && <span className="block truncate text-[12px] text-ink-mute">{o.hint}</span>}
                  </span>
                </span>
                {active && <span className="shrink-0 text-brand"><Icon.Check width={16} height={16} /></span>}
              </button>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes pickerIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
