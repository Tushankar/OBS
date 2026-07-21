import { useState, useRef, useEffect, useMemo } from 'react';
import { searchCountries } from '../../lib/countries';
import { ChapterFlag } from './ChapterMark';
import { inputCls } from '../portal/Kit';

// Country typeahead: the user types to filter a full ISO country list and picks
// a name from the dropdown (each row shows its flag). It's still a controlled
// text field, so a value set programmatically (e.g. the venue geocoder) shows
// through, and a free-typed value is kept — the dropdown just guides them to a
// canonical country name.
export default function CountryField({ value, onChange, disabled = false, placeholder = 'Type to search countries…', id }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const listRef = useRef(null);

  // Reflect external changes (geocoder fill, edit-mode hydrate).
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Close when clicking outside.
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const matches = useMemo(() => searchCountries(query), [query]);
  useEffect(() => { setActive(0); }, [query]);

  // Keep the highlighted row in view while arrowing.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (c) => { onChange(c.name); setQuery(c.name); setOpen(false); };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { if (open && matches[active]) { e.preventDefault(); pick(matches[active]); } }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        className={inputCls}
        value={query}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-pop"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-ink-mute">No country matches “{query}”.</li>
          ) : (
            matches.map((c, i) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(c)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors ${
                    i === active ? 'bg-brand-soft text-brand-dark' : 'text-ink hover:bg-surface'
                  }`}
                >
                  <ChapterFlag code={c.code} className="h-3 w-4 shrink-0 rounded-[2px]" />
                  <span className="truncate">{c.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
