import { useEffect, useState, useCallback } from 'react';
import { Btn, Field, inputCls, Loading, Pill } from '../portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { CURRENCY_SYMBOL } from '../../lib/currency';

// Major units in the UI ↔ integer minor units on the wire (money rule):
// ₹ ↔ paise, AED ↔ fils, $ ↔ cents — always ×100.
const toMinor = (major) => Math.round(Number(major) * 100);
const toMajor = (minor) => (Number(minor) / 100).toString();

const BLANK = { name: '', priceMajor: '0', quantityTotal: '100', minPerOrder: '1', maxPerOrder: '10', validDays: [] };

const DAY_MS = 24 * 60 * 60 * 1000;
const dayCount = (startAt, endAt) => {
  if (!startAt || !endAt) return 1;
  const s = new Date(startAt), e = new Date(endAt);
  if (isNaN(s) || isNaN(e)) return 1;
  const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  return Math.max(1, Math.round((ed - sd) / DAY_MS) + 1);
};
const dayLabel = (startAt, n) => {
  const s = new Date(startAt);
  if (isNaN(s)) return `Day ${n}`;
  const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + (n - 1));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// `admin` switches to the /admin/events/:id/ticket-types endpoints — the admin
// manages tickets on any event (OBS platform events have no organizer session).
// `startAt`/`endAt` (optional) enable the per-day validity picker for
// multi-day events: which event days each ticket type admits.
// `currency` is the EVENT's settlement currency (platform default AED) — every
// price here renders in it, never a hardcoded ₹.
export default function TicketTypesEditor({ eventId, admin = false, startAt = null, endAt = null, currency = 'AED' }) {
  const { pushToast } = useApp();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null); // { id? , ...fields } when adding/editing
  const [busy, setBusy] = useState(false);

  const sym = (CURRENCY_SYMBOL[currency] || `${currency} `).trim();
  const fmt = (minor) => `${sym}${(Number(minor) / 100).toLocaleString('en-IN')}`;

  const ep = admin
    ? { list: api.adminEventTicketTypes, create: api.adminCreateTicketType, update: api.adminUpdateTicketType, remove: api.adminDeleteTicketType }
    : { list: api.eventTicketTypes, create: api.createTicketType, update: api.updateTicketType, remove: api.deleteTicketType };

  const load = useCallback(() => {
    ep.list(eventId).then(setItems).catch((e) => { setItems([]); pushToast(apiError(e), false); });
  }, [eventId, pushToast]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const totalDays = dayCount(startAt, endAt);
  const multiDay = totalDays > 1;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const startAdd = () => setForm({ ...BLANK });
  const startEdit = (t) => setForm({ id: t.id, name: t.name, priceMajor: toMajor(t.price), quantityTotal: String(t.quantityTotal), minPerOrder: String(t.minPerOrder), maxPerOrder: String(t.maxPerOrder), validDays: t.validDays || [] });
  const toggleDay = (n) => setForm((f) => ({
    ...f,
    validDays: (f.validDays || []).includes(n) ? f.validDays.filter((d) => d !== n) : [...(f.validDays || []), n].sort((a, b) => a - b),
  }));

  async function save() {
    if (!form.name.trim()) { pushToast('Ticket name is required', false); return; }
    const body = {
      name: form.name.trim(),
      price: toMinor(form.priceMajor || 0),
      quantityTotal: parseInt(form.quantityTotal, 10) || 0,
      minPerOrder: parseInt(form.minPerOrder, 10) || 1,
      maxPerOrder: parseInt(form.maxPerOrder, 10) || 1,
      validDays: multiDay ? (form.validDays || []) : [],
    };
    if (!Number.isInteger(body.price) || body.price < 0) { pushToast('Enter a valid price', false); return; }
    if (body.quantityTotal < 1) { pushToast('Quantity must be at least 1', false); return; }
    setBusy(true);
    try {
      if (form.id) await ep.update(eventId, form.id, body);
      else await ep.create(eventId, body);
      setForm(null);
      pushToast('Ticket type saved');
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not save ticket type'), false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(t) {
    if (!window.confirm(`Delete ticket type “${t.name}”?`)) return;
    setBusy(true);
    try {
      await ep.remove(eventId, t.id);
      pushToast('Ticket type deleted');
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not delete'), false);
    } finally {
      setBusy(false);
    }
  }

  if (items === null) return <Loading />;

  return (
    <div className="grid gap-4">
      {items.length === 0 && !form && (
        <p className="text-[13px] text-[#6B7280]">No ticket types yet. Add at least one (use price 0 for a free ticket).</p>
      )}

      {items.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E8ECF2] p-3.5">
          <div>
            <div className="flex items-center gap-2 font-semibold text-[#111827]">
              {t.name} {t.price === 0 ? <Pill tone="green">Free</Pill> : <span className="text-[#8E6B1D] font-semibold">{fmt(t.price)}</span>}
              {multiDay && (
                <Pill tone={t.validDays?.length ? 'blue' : 'gray'}>
                  {t.validDays?.length ? `Day ${t.validDays.join(' & ')}` : `All ${totalDays} days`}
                </Pill>
              )}
            </div>
            <div className="mt-0.5 text-[12px] text-[#6B7280]">
              {t.quantityAvailable}/{t.quantityTotal} available · {t.minPerOrder}–{t.maxPerOrder} per order{t.quantitySold > 0 ? ` · ${t.quantitySold} sold` : ''}
            </div>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" onClick={() => startEdit(t)}>Edit</Btn>
            <Btn size="sm" variant="danger" disabled={busy} onClick={() => remove(t)}>Delete</Btn>
          </div>
        </div>
      ))}

      {form ? (
        <div className="rounded-md border border-[#C99E25]/30 bg-[#FBF6E9] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="General / VIP / Early Bird" /></Field>
            <Field label={`Price (${sym || currency}) — 0 for free`}><input type="number" min="0" step="1" className={inputCls} value={form.priceMajor} onChange={(e) => set('priceMajor', e.target.value)} /></Field>
            <Field label="Quantity"><input type="number" min="1" className={inputCls} value={form.quantityTotal} onChange={(e) => set('quantityTotal', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min / order"><input type="number" min="1" className={inputCls} value={form.minPerOrder} onChange={(e) => set('minPerOrder', e.target.value)} /></Field>
              <Field label="Max / order"><input type="number" min="1" className={inputCls} value={form.maxPerOrder} onChange={(e) => set('maxPerOrder', e.target.value)} /></Field>
            </div>
            {multiDay && (
              <div className="sm:col-span-2">
                <Field label="Valid on days" hint={(form.validDays || []).length === 0 ? `No days selected = admits all ${totalDays} days (full pass)` : 'Ticket admits only on the selected day(s)'}>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((n) => {
                      const on = (form.validDays || []).includes(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => toggleDay(n)}
                          className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${on ? 'border-[#C99E25] bg-[#C99E25] text-white' : 'border-[#E8ECF2] bg-white text-[#4B5563] hover:border-[#E5C060]'}`}
                        >
                          Day {n} · {dayLabel(startAt, n)}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Btn size="sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save ticket type'}</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setForm(null)} disabled={busy}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <div><Btn size="sm" variant="ghost" onClick={startAdd}>+ Add ticket type</Btn></div>
      )}
    </div>
  );
}
