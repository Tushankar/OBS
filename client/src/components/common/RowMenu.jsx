import { useState } from 'react';
import { AdminIcon } from '../admin/AdminIcons';

// Row overflow (⋯) menu for table actions — secondary/destructive actions live
// here so the actions column keeps a fixed, small width and nothing (like a
// Cancel button) ever falls off-screen behind the table's horizontal scroll.
// Items: { label, onClick, danger?, hidden? }. Falsy items are skipped, so
// callers can write conditional lists inline.
//
// The menu is position:fixed (viewport coords) so it can't be clipped by the
// Table's overflow-x-auto scroll container.
export default function RowMenu({ items, disabled }) {
  const [pos, setPos] = useState(null); // {top,right} viewport coords; null = closed
  const visible = items.filter((i) => i && !i.hidden);
  if (!visible.length) return null;
  const toggle = (e) => {
    if (pos) { setPos(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  };
  return (
    <>
      <button
        onClick={toggle}
        disabled={disabled}
        aria-label="More actions"
        title="More actions"
        className="grid h-8 w-8 place-items-center rounded-lg border border-[#E8ECF2] text-[#6B7280] transition hover:border-[#C99E25] hover:text-[#111827] disabled:opacity-50"
      >
        <AdminIcon.More size={15} />
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setPos(null)} />
          <div className="fixed z-[60] w-52 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg" style={{ top: pos.top, right: pos.right }}>
            {visible.map((i) => (
              <button
                key={i.label}
                onClick={() => { setPos(null); i.onClick(); }}
                className={`block w-full px-3.5 py-2 text-left text-[13px] transition hover:bg-gray-50 ${i.danger ? 'text-[#B91C1C]' : 'text-gray-700'}`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
