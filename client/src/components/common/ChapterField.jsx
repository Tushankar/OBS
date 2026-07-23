import { useState, useRef, useEffect, useMemo } from 'react';
import { selectCls } from '../portal/Kit';

// Chapter picker. Like CurrencyField, this replaces a native <select> whose
// long option list the browser sizes/positions itself (overflowing the viewport
// near the bottom of a tall modal). A controlled, fixed-height, searchable list
// that flips above the trigger only when there isn't room below.
//
// `chapters` is the raw chapters list ({ id, name, flagEmoji }). `value` is the
// selected chapter id ('' = none). Includes a "No chapter" row unless
// allowNone is false.
export default function ChapterField({ value, onChange, chapters = [], disabled = false, id, allowNone = true, noneLabel = 'No chapter' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  // { id, label, emoji } rows — a leading none row when allowed.
  const options = useMemo(() => {
    const rows = chapters.map((c) => ({ id: c.id, label: c.name, emoji: c.flagEmoji || '' }));
    return allowNone ? [{ id: '', label: noneLabel, emoji: '' }, ...rows] : rows;
  }, [chapters, allowNone, noneLabel]);

  const selected = options.find((o) => o.id === value) || (allowNone ? options[0] : null);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [query, options]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) setDropUp(window.innerHeight - rect.bottom < 300 && rect.top > window.innerHeight - rect.bottom);
    const i = options.findIndex((o) => o.id === value);
    setActive(i < 0 ? 0 : i);
    searchRef.current?.focus();
  }, [open, value, options]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (o) => { onChange(o.id); setOpen(false); setQuery(''); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { if (matches[active]) { e.preventDefault(); pick(matches[active]); } }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${selectCls} flex w-full items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {selected?.emoji && <span className="shrink-0">{selected.emoji}</span>}
        <span className="truncate">{selected?.label || noneLabel}</span>
        <svg className="ml-auto h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <div
          className={`absolute z-40 w-full min-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          <div className="border-b border-gray-100 p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search chapter…"
              className="h-8 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none focus:border-[#E5B700]"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-gray-500">No chapter matches “{query}”.</li>
            ) : (
              matches.map((o, i) => (
                <li key={o.id || '__none'}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.id === value}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors ${
                      i === active ? 'bg-[#FFFAEF] text-[#8a6d00]' : 'text-gray-700 hover:bg-gray-50'
                    } ${o.id === value ? 'font-semibold' : ''} ${o.id === '' ? 'text-gray-500' : ''}`}
                  >
                    {o.emoji && <span className="shrink-0">{o.emoji}</span>}
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
