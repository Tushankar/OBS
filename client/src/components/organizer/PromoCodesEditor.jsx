import { useEffect, useState, useCallback } from 'react';
import { Btn, Field, inputCls, Loading, Pill } from '../portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const toRupees = (paise) => (Number(paise) / 100).toString();

const BLANK = { code: '', discountType: 'PERCENT', discountValue: '10', minOrderRupees: '', maxUses: '' };

// `admin` switches to the /admin/events/:id/promo-codes endpoints (admins
// manage codes on any event — OBS platform events have no organizer session).
export default function PromoCodesEditor({ eventId, admin = false }) {
  const { pushToast } = useApp();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const ep = admin
    ? { list: api.adminEventPromoCodes, create: api.adminCreateEventPromo, update: api.adminUpdateEventPromo, remove: api.adminDeleteEventPromo }
    : { list: api.eventPromoCodes, create: api.createPromoCode, update: api.updatePromoCode, remove: api.deletePromoCode };

  const load = useCallback(() => {
    ep.list(eventId).then(setItems).catch((e) => { setItems([]); pushToast(apiError(e), false); });
  }, [eventId, pushToast]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const startAdd = () => setForm({ ...BLANK });
  const startEdit = (p) => setForm({
    id: p.id, code: p.code, discountType: p.discountType,
    discountValue: p.discountType === 'FLAT' ? toRupees(p.discountValue) : String(p.discountValue),
    minOrderRupees: p.minOrderAmount != null ? toRupees(p.minOrderAmount) : '',
    maxUses: p.maxUses != null ? String(p.maxUses) : '',
  });

  const describe = (p) => p.discountType === 'PERCENT' ? `${p.discountValue}% off` : `₹${(p.discountValue / 100).toLocaleString('en-IN')} off`;

  async function save() {
    const code = form.code.trim().toUpperCase();
    if (code.length < 2) { pushToast('Enter a promo code', false); return; }
    const body = {
      code,
      discountType: form.discountType,
      // PERCENT → whole number; FLAT → rupees→paise
      discountValue: form.discountType === 'FLAT' ? toPaise(form.discountValue || 0) : parseInt(form.discountValue, 10) || 0,
    };
    if (form.minOrderRupees !== '') body.minOrderAmount = toPaise(form.minOrderRupees);
    if (form.maxUses !== '') body.maxUses = parseInt(form.maxUses, 10);
    setBusy(true);
    try {
      if (form.id) await ep.update(eventId, form.id, body);
      else await ep.create(eventId, body);
      setForm(null);
      pushToast('Promo code saved');
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not save promo code'), false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p) {
    if (!window.confirm(`Delete promo code “${p.code}”?`)) return;
    setBusy(true);
    try {
      await ep.remove(eventId, p.id);
      pushToast('Promo code deleted');
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
      {items.length === 0 && !form && <p className="text-[13px] text-ink-mute">No promo codes yet. Add one to offer a discount (optional).</p>}

      {items.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3.5">
          <div>
            <div className="flex items-center gap-2 font-semibold text-ink">
              <span className="font-mono">{p.code}</span>
              <Pill tone={p.isActive ? 'green' : 'gray'}>{describe(p)}</Pill>
            </div>
            <div className="mt-0.5 text-[12px] text-ink-mute">
              {p.usedCount} used{p.maxUses != null ? ` / ${p.maxUses}` : ''}{p.minOrderAmount ? ` · min ₹${(p.minOrderAmount / 100).toLocaleString('en-IN')}` : ''}
            </div>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" onClick={() => startEdit(p)}>Edit</Btn>
            <Btn size="sm" variant="danger" disabled={busy} onClick={() => remove(p)}>Delete</Btn>
          </div>
        </div>
      ))}

      {form ? (
        <div className="rounded-md border border-brand/40 bg-brand-soft/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code"><input className={`${inputCls} font-mono uppercase`} value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="EARLYBIRD" /></Field>
            <Field label="Type">
              <select className={inputCls} value={form.discountType} onChange={(e) => set('discountType', e.target.value)}>
                <option value="PERCENT">Percentage (%)</option>
                <option value="FLAT">Flat (₹)</option>
              </select>
            </Field>
            <Field label={form.discountType === 'PERCENT' ? 'Discount (%)' : 'Discount (₹)'}>
              <input type="number" min="1" className={inputCls} value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} />
            </Field>
            <Field label="Min order (₹, optional)"><input type="number" min="0" className={inputCls} value={form.minOrderRupees} onChange={(e) => set('minOrderRupees', e.target.value)} /></Field>
            <Field label="Max uses (optional)"><input type="number" min="1" className={inputCls} value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} /></Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn size="sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save promo code'}</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setForm(null)} disabled={busy}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <div><Btn size="sm" variant="ghost" onClick={startAdd}>+ Add promo code</Btn></div>
      )}
    </div>
  );
}
