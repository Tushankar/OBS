import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import {
  PageHead, Table, Pill, statusTone, Btn, Loading, formatPrice, Tabs,
} from '../../components/portal/Kit';
import ReasonDialog from '../../components/admin/ReasonDialog';
import { useAdminCounts } from '../../components/admin/AdminCounts';

const TABS = [
  { key: 'REQUESTED', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PROCESSED', label: 'Processed' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: '', label: 'All' },
];
const PAGE_SIZE = 25;

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
  const { refresh: refreshCounts } = useAdminCounts(); // sidebar badge
  const [tab, setTab] = useState('');
  const [data, setData] = useState(null); // { refunds, total, page, pages, counts }
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // refund pending rejection

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const buildParams = useCallback((pg) => ({ ...(tab ? { status: tab } : {}), page: pg, limit: PAGE_SIZE }), [tab]);

  const load = useCallback(() => {
    setData(null);
    setPage(1);
    api.adminRefunds(buildParams(1))
      .then(setData)
      .catch((e) => { setData({ refunds: [], total: 0, pages: 0, counts: {} }); pushToast(apiError(e), false); });
  }, [buildParams, pushToast]);
  useEffect(() => { load(); }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const d = await api.adminRefunds(buildParams(next));
      setData((cur) => ({ ...d, refunds: [...cur.refunds, ...d.refunds] }));
      setPage(next);
    } catch (e) { pushToast(apiError(e, 'Could not load more'), false); } finally { setLoadingMore(false); }
  }

  const approve = async (row) => {
    setBusyId(row.id);
    try {
      await api.approveRefund(row.id);
      pushToast(`Refund sent to gateway for ${row.orderNumber}`);
      load();
      refreshCounts();
    } catch (e) {
      pushToast(apiError(e, 'Could not approve refund'), false);
    } finally { setBusyId(null); }
  };

  const reject = async (notes) => {
    const row = rejecting;
    setBusyId(row.id);
    try {
      await api.rejectRefund(row.id, notes);
      pushToast(`Refund rejected for ${row.orderNumber}`);
      setRejecting(null);
      load();
      refreshCounts();
    } catch (e) {
      pushToast(apiError(e, 'Could not reject refund'), false);
    } finally { setBusyId(null); }
  };

  const renderCell = (row, key) => {
    switch (key) {
      case 'orderNumber':
        return <span className="font-semibold text-[#111827]">{row.orderNumber || '—'}</span>;
      case 'event':
        return <span className="text-[#4B5563]">{row.event?.title || '—'}</span>;
      case 'amount':
        return <span className="font-medium text-[#111827]">{formatPrice(row.amount || 0)}</span>;
      case 'reason':
        return <span className="text-[#6B7280]" title={row.reason}>{row.reason || '—'}</span>;
      case 'requestedBy':
        return <span className="text-[#4B5563]">{row.requestedBy?.name || row.requestedBy?.email || '—'}</span>;
      case 'status':
        return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
      case 'actions':
        if (row.status !== 'REQUESTED') {
          return row.adminNotes ? <span className="text-ink-faint" title={row.adminNotes}>note</span> : <span className="text-ink-faint">—</span>;
        }
        return (
          <div className="flex gap-2">
            <Btn size="sm" variant="primary" disabled={busyId === row.id} onClick={() => approve(row)}>Approve</Btn>
            <Btn size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => setRejecting(row)} className="!text-[#B91C1C]">Reject</Btn>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead title="Refunds" subtitle="Approve requests to trigger the gateway refund; the webhook confirms the money." />
      <Tabs
        tabs={TABS.map((t) => {
          const n = t.key ? (data?.counts || {})[t.key] : null;
          return [t.key, n ? `${t.label} (${n})` : t.label];
        })}
        active={tab}
        onChange={setTab}
      />
      {!data ? (
        <Loading />
      ) : (
        <>
          <Table
            columns={COLUMNS}
            rows={data.refunds}
            renderCell={renderCell}
            empty="No refund requests here."
          />
          {data.refunds.length < (data.total || 0) && (
            <div className="mt-4 text-center">
              <Btn variant="ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load more (${data.total - data.refunds.length} left)`}
              </Btn>
            </div>
          )}
        </>
      )}

      <ReasonDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        onSubmit={reject}
        busy={busyId === rejecting?.id}
        title={`Reject refund — ${rejecting?.orderNumber || ''}`}
        subtitle="The order returns to PAID and the buyer sees these notes."
        label="Notes"
        placeholder="e.g. Outside the refund window per the event policy."
        confirmLabel="Reject refund"
      />
    </div>
  );
}
