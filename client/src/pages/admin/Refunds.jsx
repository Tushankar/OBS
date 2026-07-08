import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import {
  PageHead, Table, Pill, statusTone, Btn, Loading, formatPrice,
} from '../../components/portal/Kit';

const TABS = [
  { key: 'REQUESTED', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PROCESSED', label: 'Processed' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: '', label: 'All' },
];

const COLUMNS = [
  { key: 'orderNumber', label: 'Order' },
  { key: 'event', label: 'Event' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'reason', label: 'Reason' },
  { key: 'requestedBy', label: 'Requested by' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
];

export default function Refunds() {
  const { pushToast } = useApp();
  const [tab, setTab] = useState('REQUESTED');
  const [rows, setRows] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = useCallback(() => {
    setRows(null);
    api.adminRefunds(tab ? { status: tab } : undefined)
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => { setRows([]); pushToast(apiError(e), false); });
  }, [tab, pushToast]);
  useEffect(() => { load(); }, [load]);

  const approve = async (row) => {
    setBusyId(row.id);
    try {
      await api.approveRefund(row.id);
      pushToast(`Refund sent to gateway for ${row.orderNumber}`);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not approve refund'), false);
    } finally { setBusyId(null); }
  };

  const reject = async (row) => {
    const notes = window.prompt(`Reject the refund for ${row.orderNumber}? Give a reason (required):`, '');
    if (notes === null) return;
    if (notes.trim().length < 3) { pushToast('Please enter a reason (min 3 characters)', false); return; }
    setBusyId(row.id);
    try {
      await api.rejectRefund(row.id, notes.trim());
      pushToast(`Refund rejected for ${row.orderNumber}`);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not reject refund'), false);
    } finally { setBusyId(null); }
  };

  const renderCell = (row, key) => {
    switch (key) {
      case 'orderNumber':
        return <span className="font-semibold text-ink">{row.orderNumber || '—'}</span>;
      case 'event':
        return <span className="text-ink-soft">{row.event?.title || '—'}</span>;
      case 'amount':
        return <span className="font-medium text-ink">{formatPrice(row.amount || 0)}</span>;
      case 'reason':
        return <span className="text-ink-mute" title={row.reason}>{row.reason || '—'}</span>;
      case 'requestedBy':
        return <span className="text-ink-soft">{row.requestedBy?.name || row.requestedBy?.email || '—'}</span>;
      case 'status':
        return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
      case 'actions':
        if (row.status !== 'REQUESTED') {
          return row.adminNotes ? <span className="text-ink-faint" title={row.adminNotes}>note</span> : <span className="text-ink-faint">—</span>;
        }
        return (
          <div className="flex gap-2">
            <Btn size="sm" variant="primary" disabled={busyId === row.id} onClick={() => approve(row)}>Approve</Btn>
            <Btn size="sm" variant="danger" disabled={busyId === row.id} onClick={() => reject(row)}>Reject</Btn>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead title="Refunds" subtitle="Approve requests to trigger the gateway refund; the webhook confirms the money." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key || 'all'}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${tab === t.key ? 'bg-brand text-white' : 'border border-line text-ink-soft hover:border-brand hover:text-brand'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {!rows ? (
        <Loading />
      ) : (
        <Table
          columns={COLUMNS}
          rows={rows}
          renderCell={renderCell}
          empty="No refund requests here."
        />
      )}
    </div>
  );
}
