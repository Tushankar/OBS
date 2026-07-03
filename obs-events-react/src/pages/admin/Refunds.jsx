import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';
import {
  PageHead, Table, Pill, statusTone, Btn, Loading, formatPrice,
} from '../../components/portal/Kit';

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
  const [rows, setRows] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let alive = true;
    api.adminRefunds().then((r) => { if (alive) setRows(Array.isArray(r) ? r : []); });
    return () => { alive = false; };
  }, []);

  if (!rows) return <Loading />;

  const decide = (row, next) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    pushToast(
      next === 'APPROVED'
        ? `Refund approved for ${row.orderNumber}`
        : `Refund rejected for ${row.orderNumber}`,
      next === 'APPROVED',
    );
  };

  const renderCell = (row, key) => {
    switch (key) {
      case 'orderNumber':
        return <span className="font-semibold text-ink">{row.orderNumber}</span>;
      case 'event':
        return <span className="text-ink-soft">{row.event}</span>;
      case 'amount':
        return <span className="font-medium text-ink">{formatPrice(row.amount || 0)}</span>;
      case 'reason':
        return <span className="text-ink-mute">{row.reason || '—'}</span>;
      case 'requestedBy':
        return <span className="text-ink-soft">{row.requestedBy}</span>;
      case 'status':
        return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
      case 'actions':
        if (row.status !== 'REQUESTED') return <span className="text-ink-faint">—</span>;
        return (
          <div className="flex gap-2">
            <Btn size="sm" variant="primary" onClick={() => decide(row, 'APPROVED')}>Approve</Btn>
            <Btn size="sm" variant="danger" onClick={() => decide(row, 'REJECTED')}>Reject</Btn>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead title="Refunds" subtitle={`${rows.length} refund request${rows.length === 1 ? '' : 's'}`} />
      <Table
        columns={COLUMNS}
        rows={rows}
        renderCell={renderCell}
        empty="No refund requests yet."
      />
    </div>
  );
}
