import { useState, useRef, useEffect, useMemo } from 'react';
import { CURRENCIES, CURRENCY_LABEL, CURRENCY_SYMBOL, CURRENCY_FLAG } from '../../lib/currency';
import { ChapterFlag } from './ChapterMark';
import { selectCls } from '../portal/Kit';

// Currency picker. A native <select> for ~40 currencies renders an option list
// the browser sizes and positions itself — near the bottom of a tall modal it
// opens upward and overflows the viewport. This is a controlled custom dropdown
// instead: a fixed-height, scrollable, searchable list that flips above the
// trigger only when there isn't room below, so it always stays on-screen.
export default function CurrencyField({ value, onChange, disabled = false, id, className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  // Close when clicking outside.
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return CURRENCIES;
    return CURRENCIES.filter((c) => `${c} ${CURRENCY_LABEL[c]} ${CURRENCY_SYMBOL[c]}`.toLowerCase().includes(needle));
  }, [query]);

  useEffect(() => { setActive(0); }, [query]);

  // On open: decide flip direction from available space and focus the search.
  useEffect(() => {
    if (!open) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) setDropUp(window.innerHeight - rect.bottom < 300 && rect.top > window.innerHeight - rect.bottom);
    const i = CURRENCIES.indexOf(value);
    setActive(i < 0 ? 0 : i);
    searchRef.current?.focus();
  }, [open, value]);

  // Keep the highlighted row in view while arrowing.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (c) => { onChange(c); setOpen(false); setQuery(''); };

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
        className={`${selectCls} flex w-full items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {CURRENCY_FLAG[value] && <ChapterFlag code={CURRENCY_FLAG[value]} className="h-3 w-4 rounded-[2px]" />}
        <span className="truncate">{CURRENCY_LABEL[value] || value || 'Select currency'}</span>
        <svg className="ml-auto h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <div
          className={`absolute z-40 w-full min-w-[180px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          <div className="border-b border-gray-100 p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search currency…"
              className="h-8 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none focus:border-[#E5B700]"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-gray-500">No currency matches “{query}”.</li>
            ) : (
              matches.map((c) => {
                const i = matches.indexOf(c);
                return (
                  <li key={c}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={c === value}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(c)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors ${
                        i === active ? 'bg-[#FFFAEF] text-[#8a6d00]' : 'text-gray-700 hover:bg-gray-50'
                      } ${c === value ? 'font-semibold' : ''}`}
                    >
                      {CURRENCY_FLAG[c] && <ChapterFlag code={CURRENCY_FLAG[c]} className="h-3 w-4 shrink-0 rounded-[2px]" />}
                      <span className="truncate">{CURRENCY_LABEL[c] || c}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
