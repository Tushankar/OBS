/* Organizer — email delivery log for their own events: ticket deliveries,
 * reminders, payment/refund updates sent to their attendees, with status.
 */
import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Card, Loading } from '../../components/portal/Kit';

const COLUMNS = [
  { key: 'sentAt', label: 'When' },
  { key: 'type', label: 'Type' },
  { key: 'to', label: 'To' },
  { key: 'subject', label: 'Subject' },
  { key: 'event', label: 'Event' },
  { key: 'status', label: 'Status' },
];

const selectCls = 'h-9 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-brand';
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const typeLabel = (t) => t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

export default function Emails() {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [eventId, setEventId] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = useCallback(() => {
    api.organizerEmails({ eventId: eventId || undefined })
      .then(setData)
      .catch((e) => { setData({ emails: [], events: [], total: 0 }); pushToast(apiError(e), false); });
  }, [eventId, pushToast]);
  useEffect(() => { load(); }, [load]);

  const renderCell = (row, key) => {
    if (key === 'sentAt') return <span className="whitespace-nowrap text-ink-mute">{fmtWhen(row.sentAt)}</span>;
    if (key === 'type') return <span className="text-[12px] font-medium text-ink-soft">{typeLabel(row.type)}</span>;
    if (key === 'to') return <span className="text-ink">{row.to}</span>;
    if (key === 'subject') return <span className="block max-w-[260px] truncate text-ink-soft" title={row.subject}>{row.subject}</span>;
    if (key === 'event') return <span className="block max-w-[180px] truncate text-ink-mute" title={row.event || ''}>{row.event || '—'}</span>;
    if (key === 'status') return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
    return row[key];
  };

  return (
    <div>
      <PageHead
        title="Emails"
        subtitle="Everything the platform has emailed your attendees — tickets, reminders and updates, with delivery status."
      />
      <Card className="mb-4">
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={selectCls} aria-label="Filter by event">
          <option value="">All my events</option>
          {(data?.events || []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </Card>
      {!data ? <Loading /> : (
        <Table
          columns={COLUMNS}
          rows={data.emails}
          renderCell={renderCell}
          empty="No emails yet — ticket deliveries and reminders will appear here as your attendees book."
        />
      )}
    </div>
  );
}
