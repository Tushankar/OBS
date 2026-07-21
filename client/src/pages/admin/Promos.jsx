/* Hallmark · modern-minimal · admin — platform-wide promo campaigns.
 * Codes here apply across every event; per-event codes stay with organizers.
 * pre-emit critique: P5 H5 E4 S4 R5 V4
 */
import { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import {
  PageHead, Card, Table, Btn, Pill, Modal, ConfirmDialog, Field,
  inputCls, selectCls, statusTone, Loading, formatPrice,
} from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { usePagedList } from '../../lib/usePagedList';

const toLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};
const rupees = (paise) => (paise == null ? '' : String(paise / 100));

const BLANK = { code: '', discountType: 'PERCENT', discountValue: '', maxUses: '', minOrder: '', validFrom: '', validUntil: '', isActive: true };

function fromRow(p) {
  return {
    code: p.code,
    discountType: p.discountType,
    discountValue: p.discountType === 'FLAT' ? rupees(p.discountValue) : String(p.discountValue),
    maxUses: p.maxUses == null ? '' : String(p.maxUses),
    minOrder: p.minOrderAmount == null ? '' : rupees(p.minOrderAmount),
    validFrom: toLocal(p.validFrom),
    validUntil: toLocal(p.validUntil),
    isActive: p.isActive,
  };
}

function PromoEditor({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const editing = !!initial?.id;
  const [form, setForm] = useState(initial ? fromRow(initial) : BLANK);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isPct = form.discountType === 'PERCENT';

  const save = async () => {
    const val = Number(form.discountValue);
    if (!editing && !/^[A-Z0-9._-]{2,40}$/.test(form.code.trim().toUpperCase())) { pushToast('Enter a code (2–40 chars: letters, numbers, . _ -)', false); return; }
    if (!val || val < 1) { pushToast('Enter a discount value', false); return; }
    if (isPct && val > 100) { pushToast('A percentage discount can’t exceed 100', false); return; }

    const body = {
      discountType: form.discountType,
      discountValue: isPct ? Math.round(val) : Math.round(val * 100), // FLAT collected in ₹ → paise
      isActive: form.isActive,
    };
    if (!editing) body.code = form.code.trim().toUpperCase();
    if (form.maxUses !== '') body.maxUses = Number(form.maxUses);
    if (form.minOrder !== '') body.minOrderAmount = Math.round(Number(form.minOrder) * 100);
    if (form.validFrom) body.validFrom = new Date(form.validFrom).toISOString();
    if (form.validUntil) body.validUntil = new Date(form.validUntil).toISOString();

    setBusy(true);
    try {
      if (editing) await api.updatePromo(initial.id, body);
      else await api.createPromo(body);
      pushToast(editing ? 'Promo updated' : 'Promo created');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not save promo'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={editing ? `Edit ${initial.code}` : 'New platform promo'}
      subtitle="Applies across every event at checkout."
      width="max-w-lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create promo'}</Btn>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Code" hint={editing ? 'Code can’t be changed after creation.' : 'Shown to users at checkout, e.g. WELCOME10.'}>
            <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} disabled={editing} placeholder="WELCOME10" className={`${inputCls} ${editing ? 'opacity-60' : ''} font-mono tracking-wide`} />
          </Field>
        </div>
        <Field label="Discount type">
          <select value={form.discountType} onChange={(e) => set('discountType', e.target.value)} className={`${selectCls} w-full`}>
            <option value="PERCENT">Percentage (%)</option>
            <option value="FLAT">Flat amount (₹)</option>
          </select>
        </Field>
        <Field label={isPct ? 'Percent off (1–100)' : 'Amount off (₹)'}>
          <input type="number" min="1" max={isPct ? 100 : undefined} value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} placeholder={isPct ? '10' : '500'} className={inputCls} />
        </Field>
        <Field label="Max uses" hint="Blank = unlimited.">
          <input type="number" min="1" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} placeholder="Unlimited" className={inputCls} />
        </Field>
        <Field label="Min order (₹)" hint="Blank = no minimum.">
          <input type="number" min="0" value={form.minOrder} onChange={(e) => set('minOrder', e.target.value)} placeholder="None" className={inputCls} />
        </Field>
        <Field label="Valid from" hint="Blank = immediately.">
          <input type="datetime-local" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Valid until" hint="Blank = no expiry.">
          <input type="datetime-local" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} className={inputCls} />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-[#374151] sm:col-span-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 accent-[#C99E25]" /> Active (accepted at checkout)
        </label>
      </div>
    </Modal>
  );
}

const fmtWindow = (from, until) => {
  const d = (x) => new Date(x).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  if (!from && !until) return 'Always';
  if (from && until) return `${d(from)} – ${d(until)}`;
  if (until) return `Until ${d(until)}`;
  return `From ${d(from)}`;
};

export default function Promos() {
  const { pushToast } = useApp();
  const { rows, load, loadMore, loadingMore, hasMore, remaining } = usePagedList({
    fetch: api.adminPromos, key: 'promoCodes', limit: 50,
    onError: (e) => pushToast(apiError(e), false),
  });
  const [editing, setEditing] = useState(null); // row or {} for new
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const del = async () => {
    setBusy(true);
    try { await api.deletePromo(confirm.id); pushToast('Promo deleted'); setConfirm(null); load(); }
    catch (e) { pushToast(apiError(e), false); }
    finally { setBusy(false); }
  };

  if (rows === null) return <Loading />;

  const platform = rows.filter((r) => r.scope === 'PLATFORM');
  const eventScoped = rows.filter((r) => r.scope !== 'PLATFORM');

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'discount', label: 'Discount' },
    { key: 'usage', label: 'Usage' },
    { key: 'window', label: 'Window' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', align: 'right' },
  ];

  const renderCell = (row, key) => {
    if (key === 'code') return <span className="font-mono text-[12.5px] font-bold tracking-wide text-[#111827]">{row.code}</span>;
    if (key === 'discount') return <span className="font-semibold text-[#111827] [font-variant-numeric:tabular-nums]">{row.discountType === 'PERCENT' ? `${row.discountValue}% off` : `${formatPrice(row.discountValue)} off`}</span>;
    if (key === 'usage') return <span className="text-[#4B5563] [font-variant-numeric:tabular-nums]">{row.usedCount}{row.maxUses != null ? ` / ${row.maxUses}` : ' / ∞'}</span>;
    if (key === 'window') return <span className="text-[#6B7280]">{fmtWindow(row.validFrom, row.validUntil)}</span>;
    if (key === 'status') return <Pill tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? 'Active' : 'Inactive'}</Pill>;
    if (key === 'actions') return (
      <div className="flex items-center justify-end gap-1">
        <Btn size="sm" variant="ghost" onClick={() => setEditing(row)}>Edit</Btn>
        <button
          onClick={() => setConfirm(row)}
          disabled={row.usedCount > 0}
          title={row.usedCount > 0 ? 'Used codes can’t be deleted — deactivate instead' : 'Delete'}
          className="rounded-md p-1.5 text-[#6B7280] transition hover:bg-[#FEF2F2] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B7280]"
        >
          <AdminIcon.Trash size={15} />
        </button>
      </div>
    );
    return null;
  };

  return (
    <div>
      <PageHead
        title="Promo codes"
        subtitle="Platform-wide discount campaigns that apply across every event at checkout."
        actions={<Btn onClick={() => setEditing({})}><AdminIcon.Plus size={15} /> New promo</Btn>}
      />

      <Table columns={columns} rows={platform} renderCell={renderCell} empty="No platform promos yet — create a site-wide campaign to get started." />

      {eventScoped.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Event-scoped codes · read-only</h2>
          <p className="mb-3 max-w-2xl text-[12.5px] text-[#6B7280]">These belong to individual events and are managed by their organizers. Listed here for oversight.</p>
          <Table
            columns={[{ key: 'code', label: 'Code' }, { key: 'event', label: 'Event' }, { key: 'discount', label: 'Discount' }, { key: 'usage', label: 'Usage' }, { key: 'status', label: 'Status' }]}
            rows={eventScoped}
            empty=""
            renderCell={(row, key) => key === 'event'
              ? <span className="text-[#4B5563]">{row.eventTitle || '—'}</span>
              : renderCell(row, key)}
          />
        </div>
      )}
      {hasMore && (
        <div className="mt-4 text-center">
          <Btn variant="ghost" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : `Load more (${remaining} left)`}</Btn>
        </div>
      )}

      {editing && (
        <PromoEditor
          initial={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={del}
        title="Delete promo code"
        body={confirm ? `Delete “${confirm.code}”? This can’t be undone.` : ''}
        confirmLabel="Delete"
        danger
        busy={busy}
      />
    </div>
  );
}
