import { useEffect, useState, useCallback } from 'react';
import { Btn, Field, inputCls, Loading, Pill } from '../portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

// ₹ (rupees) in the UI ↔ integer paise on the wire (money rule).
const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const toRupees = (paise) => (Number(paise) / 100).toString();
const fmt = (paise) => `₹${(Number(paise) / 100).toLocaleString('en-IN')}`;

const BLANK = { name: '', priceRupees: '0', quantityTotal: '100', minPerOrder: '1', maxPerOrder: '10' };

// `admin` switches to the /admin/events/:id/ticket-types endpoints — the admin
// manages tickets on any event (OBS platform events have no organizer session).
export default function TicketTypesEditor({ eventId, admin = false }) {
  const { pushToast } = useApp();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null); // { id? , ...fields } when adding/editing
  const [busy, setBusy] = useState(false);

  const ep = admin
    ? { list: api.adminEventTicketTypes, create: api.adminCreateTicketType, update: api.adminUpdateTicketType, remove: api.adminDeleteTicketType }
    : { list: api.eventTicketTypes, create: api.createTicketType, update: api.updateTicketType, remove: api.deleteTicketType };

  const load = useCallback(() => {
    ep.list(eventId).then(setItems).catch((e) => { setItems([]); pushToast(apiError(e), false); });
  }, [eventId, pushToast]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const startAdd = () => setForm({ ...BLANK });
  const startEdit = (t) => setForm({ id: t.id, name: t.name, priceRupees: toRupees(t.price), quantityTotal: String(t.quantityTotal), minPerOrder: String(t.minPerOrder), maxPerOrder: String(t.maxPerOrder) });

  async function save() {
    if (!form.name.trim()) { pushToast('Ticket name is required', false); return; }
    const body = {
      name: form.name.trim(),
      price: toPaise(form.priceRupees || 0),
      quantityTotal: parseInt(form.quantityTotal, 10) || 0,
      minPerOrder: parseInt(form.minPerOrder, 10) || 1,
      maxPerOrder: parseInt(form.maxPerOrder, 10) || 1,
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
        <p className="text-[13px] text-ink-mute">No ticket types yet. Add at least one (use price ₹0 for a free ticket).</p>
      )}

      {items.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3.5">
          <div>
            <div className="flex items-center gap-2 font-semibold text-ink">
              {t.name} {t.price === 0 ? <Pill tone="green">Free</Pill> : <span className="text-brand">{fmt(t.price)}</span>}
            </div>
            <div className="mt-0.5 text-[12px] text-ink-mute">
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
        <div className="rounded-md border border-brand/40 bg-brand-soft/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="General / VIP / Early Bird" /></Field>
            <Field label="Price (₹) — 0 for free"><input type="number" min="0" step="1" className={inputCls} value={form.priceRupees} onChange={(e) => set('priceRupees', e.target.value)} /></Field>
            <Field label="Quantity"><input type="number" min="1" className={inputCls} value={form.quantityTotal} onChange={(e) => set('quantityTotal', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min / order"><input type="number" min="1" className={inputCls} value={form.minPerOrder} onChange={(e) => set('minPerOrder', e.target.value)} /></Field>
              <Field label="Max / order"><input type="number" min="1" className={inputCls} value={form.maxPerOrder} onChange={(e) => set('maxPerOrder', e.target.value)} /></Field>
            </div>
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
