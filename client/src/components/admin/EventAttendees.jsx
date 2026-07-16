import { useState, useEffect } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { Table, Pill, Btn, StatCard, StatGrid, SearchInput, selectCls, inputCls, Modal, Field, formatPrice, statusTone, Loading } from '../portal/Kit';

const COLUMNS = [
  { key: 'attendee', label: 'Attendee' },
  { key: 'ticket', label: 'Ticket' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'order', label: 'Order' },
  { key: 'action', label: '', align: 'right' },
];

// Admin view of everyone holding a ticket to a given event: who bought, which
// type, whether they've been checked in, plus a one-to-one templated email push.
export default function EventAttendees({ eventId }) {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [emailFor, setEmailFor] = useState(null); // ticket row being emailed

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    const t = setTimeout(() => {
      api.adminEventTickets(eventId, { page, limit: 25, status: status || undefined, search: search || undefined })
        .then((d) => { if (alive) setData(d); })
        .catch((e) => { if (alive) setErr(apiError(e, 'Could not load attendees')); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [eventId, page, status, search]);

  const currency = data?.event?.currency || 'INR';
  const s = data?.summary;

  return (
    <div>
      {s && (
        <StatGrid className="mb-4 !grid-cols-2 lg:!grid-cols-4">
          <StatCard label="Tickets sold" value={s.sold} hint={`${s.paidOrders} paid ${s.paidOrders === 1 ? 'order' : 'orders'}`} />
          <StatCard label="Checked in" value={`${s.checkedIn} / ${s.sold}`} hint={s.used ? `${s.used} used` : 'at the door'} />
          <StatCard label="Revenue" value={formatPrice(s.revenue, currency)} hint="captured" />
          <StatCard label="Cancelled / refunded" value={s.cancelled + s.refunded} hint={`${s.refunded} refunded`} />
        </StatGrid>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search name, email or ticket #"
          className="min-w-[220px] flex-1"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All statuses</option>
          <option value="VALID">Valid</option>
          <option value="USED">Used</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {err ? (
        <div className="rounded-md border border-dashed border-[#DCE3EC] px-3 py-6 text-center text-[13px] text-[#6B7280]">
          {err} <button onClick={() => setPage((p) => p)} className="ml-1 font-semibold text-[#8E6B1D] hover:underline">Retry</button>
        </div>
      ) : loading && !data ? (
        <Loading label="Loading attendees…" />
      ) : (
        <>
          <Table
            columns={COLUMNS}
            rows={data?.tickets || []}
            empty="No tickets sold for this event yet."
            renderCell={(row, key) => {
              if (key === 'attendee') return (
                <div>
                  <div className="font-semibold text-[#111827]">{row.attendeeName || '—'}</div>
                  <div className="text-[12px] text-[#6B7280]">{row.attendeeEmail || row.buyer?.email || '—'}</div>
                </div>
              );
              if (key === 'ticket') return <span className="font-mono text-[12px] text-[#374151]">{row.ticketNumber}</span>;
              if (key === 'type') return (
                <div>
                  <div>{row.ticketType || '—'}</div>
                  {row.price != null && <div className="text-[12px] text-[#6B7280]">{formatPrice(row.price, currency)}</div>}
                </div>
              );
              if (key === 'status') return (
                <div className="flex flex-col items-start gap-1">
                  <Pill tone={statusTone(row.status)}>{row.status}</Pill>
                  {row.checkedIn && <span className="text-[11px] font-medium text-[#0E7C4A]">✓ Checked in</span>}
                </div>
              );
              if (key === 'order') return <span className="font-mono text-[12px] text-[#6B7280]">{row.orderNumber || '—'}</span>;
              if (key === 'action') return (
                <Btn size="sm" variant="outline" onClick={() => setEmailFor(row)}>Email</Btn>
              );
              return null;
            }}
          />
          {data && data.pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-[12.5px] text-[#6B7280]">
              <span>Page {data.page} of {data.pages} · {data.total} tickets</span>
              <div className="flex gap-2">
                <Btn size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Btn>
                <Btn size="sm" variant="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Btn>
              </div>
            </div>
          )}
        </>
      )}

      <EmailAttendeeModal
        eventId={eventId}
        ticket={emailFor}
        onClose={() => setEmailFor(null)}
        onSent={(to) => { pushToast(`Email sent to ${to}`); setEmailFor(null); }}
      />
    </div>
  );
}

function EmailAttendeeModal({ eventId, ticket, onClose, onSent }) {
  const [templates, setTemplates] = useState(null);
  const [template, setTemplate] = useState('TICKET_INFO');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Load templates once the modal opens; prefill the first template.
  useEffect(() => {
    if (!ticket) return;
    setErr('');
    api.adminEventEmailTemplates(eventId)
      .then((t) => {
        setTemplates(t);
        const first = t.TICKET_INFO || Object.values(t)[0];
        setTemplate('TICKET_INFO');
        setSubject(first?.subject || '');
        setMessage(first?.body || '');
      })
      .catch((e) => setErr(apiError(e, 'Could not load templates')));
  }, [ticket, eventId]);

  const pickTemplate = (key) => {
    setTemplate(key);
    const tpl = templates?.[key];
    if (tpl) { setSubject(tpl.subject || ''); setMessage(tpl.body || ''); }
  };

  const send = async () => {
    if (!subject.trim()) return setErr('A subject is required');
    if (!message.trim()) return setErr('A message is required');
    setErr('');
    setBusy(true);
    try {
      const r = await api.adminEmailAttendee(eventId, ticket.id, { template, subject: subject.trim(), message: message.trim() });
      onSent(r.to || ticket.attendeeEmail);
    } catch (e) {
      setErr(apiError(e, 'Could not send the email'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!ticket}
      onClose={busy ? undefined : onClose}
      title="Email attendee"
      subtitle={ticket ? `${ticket.attendeeName || 'Ticket holder'} · ${ticket.attendeeEmail || ticket.buyer?.email || ''}` : ''}
      width="max-w-lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={send} disabled={busy || !templates}>{busy ? 'Sending…' : 'Send email'}</Btn>
        </>
      }
    >
      {!templates ? (
        <Loading label="Loading templates…" />
      ) : (
        <div className="flex flex-col gap-3">
          <Field label="Template">
            <select value={template} onChange={(e) => pickTemplate(e.target.value)} className={`${selectCls} h-9 w-full`}>
              {Object.entries(templates).map(([key, t]) => (
                <option key={key} value={key}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Subject line" />
          </Field>
          <Field label="Message" hint="Sent as a branded OBS email to this attendee. A blank line starts a new paragraph.">
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} className={`${inputCls} resize-y`} placeholder="Write your message…" />
          </Field>
          {err && <div className="text-[12.5px] text-[#EF4444]">{err}</div>}
        </div>
      )}
    </Modal>
  );
}
