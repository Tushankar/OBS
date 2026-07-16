/* Admin — support inbox. Every "report an issue" submission from the public
 * site lands here as a ticket: triage with status (Open → In progress →
 * Resolved), keep internal notes, and reply via the reporter's email. Status
 * changes are audit-logged server-side.
 */
import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Table, Pill, Btn, Modal, Field, Loading, SearchInput, selectCls, statusTone } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';

const STATUS_OPTIONS = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED'];
const CATEGORY_LABELS = {
  BOOKING: 'Booking & tickets',
  PAYMENT: 'Payments',
  REFUND: 'Refunds',
  ACCOUNT: 'Account',
  EVENT: 'Event',
  OTHER: 'Other',
};
const statusLabel = (s) => String(s || '').replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const COLUMNS = [
  { key: 'subject', label: 'Ticket' },
  { key: 'from', label: 'From' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'at', label: 'Received' },
  { key: 'action', label: '', align: 'right' },
];

// Drill-down: full message, status triage and internal notes.
function TicketModal({ ticket, onClose, onSaved }) {
  const { pushToast } = useApp();
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState(ticket.adminNotes || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.updateSupportTicket(ticket.id, { status, adminNotes: notes });
      pushToast('Ticket updated');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not update the ticket'), false);
    } finally {
      setBusy(false);
    }
  };

  const reference = String(ticket.id).slice(-6).toUpperCase();

  return (
    <Modal
      open
      onClose={onClose}
      title={ticket.subject}
      subtitle={`#${reference} · ${fmtWhen(ticket.createdAt)}`}
      width="max-w-2xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Close</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={statusTone(ticket.status)}>{statusLabel(ticket.status)}</Pill>
          <Pill tone="gray">{CATEGORY_LABELS[ticket.category] || ticket.category}</Pill>
          {ticket.user
            ? <Pill tone="brand">Registered · {ticket.user.name}</Pill>
            : <Pill tone="gray">Guest</Pill>}
        </div>

        <div className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6B7280]">Reporter</div>
          <div className="mt-1 text-[13.5px] font-semibold text-[#111827]">{ticket.name}</div>
          <a href={`mailto:${ticket.email}?subject=Re: ${encodeURIComponent(ticket.subject)} (ticket #${reference})`} className="text-[12.5px] font-medium text-[#8E6B1D] hover:underline">
            {ticket.email}
          </a>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6B7280]">Message</div>
          <p className="whitespace-pre-wrap rounded-xl border border-[#EEF2F6] px-4 py-3 text-[13.5px] leading-relaxed text-[#374151]">{ticket.message}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} w-full`}>
              {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </Field>
          <Field label="Internal notes" hint="Only visible to admins.">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={3000}
              placeholder="e.g. Refunded order #1042, waiting on Stripe."
              className="w-full resize-y rounded-[10px] border border-[#DCE3EC] bg-white px-3.5 py-2.5 text-[13px] text-[#111827] outline-none transition-all duration-150 placeholder:text-[#9CA3AF] hover:border-[#C6D0DE] focus:border-[#C99E25] focus:ring-4 focus:ring-[#C99E25]/10"
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export default function Support() {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const load = useCallback(() => {
    api.adminSupportTickets({ status: status || undefined, category: category || undefined, search: debounced || undefined })
      .then(setData)
      .catch((e) => { setData({ tickets: [], total: 0 }); pushToast(apiError(e), false); });
  }, [status, category, debounced, pushToast]);
  useEffect(() => { load(); }, [load]);

  const open = (data?.tickets || []).filter((t) => t.status === 'OPEN').length;

  const renderCell = (t, key) => {
    if (key === 'subject') return (
      <button onClick={() => setDetail(t)} className="block max-w-[320px] text-left">
        <span className="block truncate font-semibold text-[#111827] transition hover:text-[#B58C1F]">{t.subject}</span>
        <span className="block truncate text-[12px] text-[#6B7280]">{t.message}</span>
      </button>
    );
    if (key === 'from') return (
      <span className="block min-w-0 max-w-[200px]">
        <span className="block truncate font-medium text-[#111827]">{t.name}</span>
        <span className="block truncate text-[11.5px] text-[#6B7280]">{t.email}</span>
      </span>
    );
    if (key === 'category') return <Pill tone="gray">{CATEGORY_LABELS[t.category] || t.category}</Pill>;
    if (key === 'status') return <Pill tone={statusTone(t.status)}>{statusLabel(t.status)}</Pill>;
    if (key === 'at') return <span className="whitespace-nowrap text-[#6B7280]">{fmtWhen(t.createdAt)}</span>;
    if (key === 'action') return <Btn size="sm" variant="ghost" onClick={() => setDetail(t)}>View</Btn>;
    return null;
  };

  return (
    <div>
      <PageHead
        title="Support"
        subtitle={data ? `${data.total} ${data.total === 1 ? 'ticket' : 'tickets'}${open ? ` · ${open} open` : ''}` : 'User-reported issues from the public site.'}
      />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search subject, message or reporter…" className="max-w-xs" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s ? statusLabel(s) : 'All statuses'}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls} aria-label="Filter by category">
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </Card>

      {!data ? (
        <Loading />
      ) : data.tickets.length === 0 && !debounced && !status && !category ? (
        <div className="rounded-[18px] border border-dashed border-[#D8DFE8] bg-white/60 px-6 py-16 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#F3F5F9] text-[#6B7280]"><AdminIcon.Comment size={22} /></div>
          <h3 className="text-[15px] font-bold text-[#111827]">No support tickets yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[#6B7280]">
            When someone reports an issue from the site footer or help centre, it lands here for triage.
          </p>
        </div>
      ) : (
        <Table columns={COLUMNS} rows={data.tickets} renderCell={renderCell} empty="No tickets match your filters." />
      )}

      {detail && (
        <TicketModal
          ticket={detail}
          onClose={() => setDetail(null)}
          onSaved={() => { setDetail(null); load(); }}
        />
      )}
    </div>
  );
}
