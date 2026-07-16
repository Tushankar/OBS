import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHead, Table, Tabs, Pill, statusTone, Btn, Loading, Modal, Field, inputCls, selectCls } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { sponsorTierLabel } from '../../lib/labels';

const TABS = [['', 'All'], ['NEW', 'New'], ['REVIEWING', 'Reviewing'], ['APPROVED', 'Approved'], ['DECLINED', 'Declined']];
const STATUSES = ['NEW', 'REVIEWING', 'APPROVED', 'DECLINED'];
const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function LeadDrawer({ lead, onClose, onSaved }) {
  const { pushToast } = useApp();
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.adminNotes || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const updated = await api.updatePartnerApplication(lead.id, { status, adminNotes: notes.trim() });
      pushToast(updated.sponsorId && !lead.sponsorId ? 'Lead approved — draft sponsor created in Admin → Sponsors' : 'Lead updated');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not update lead'), false);
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ k, v, href }) => (
    <div className="flex gap-3 border-b border-[#EEF2F6] py-2 last:border-0">
      <div className="w-24 shrink-0 text-[12px] font-medium text-[#6B7280]">{k}</div>
      <div className="min-w-0 flex-1 break-words text-[13px] text-[#111827]">
        {v ? (href ? <a href={href} target="_blank" rel="noreferrer" className="text-[#8E6B1D] hover:underline">{v}</a> : v) : <span className="text-[#C6D0DE]">—</span>}
      </div>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={lead.orgName}
      subtitle={`Received ${fmtDate(lead.createdAt)}`}
      width="max-w-lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Close</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>
        </>
      }
    >
      <div className="rounded-lg border border-[#E8ECF2] bg-[#F8FAFC] px-3.5 py-1">
        <Row k="Contact" v={lead.contactName} />
        <Row k="Email" v={lead.email} href={`mailto:${lead.email}`} />
        <Row k="Phone" v={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
        <Row k="Website" v={lead.website} href={lead.website ? (/^https?:\/\//.test(lead.website) ? lead.website : `https://${lead.website}`) : undefined} />
        <Row k="Interest" v={lead.interestTier ? sponsorTierLabel(lead.interestTier) : null} />
        <Row k="Message" v={lead.message} />
      </div>
      {lead.status === 'APPROVED' && lead.sponsorId && (
        <div className="mt-4 rounded-lg border border-[#CBE6D2] bg-[#ECFDF5] px-3.5 py-3 text-[12.5px] text-[#047857]">
          Draft sponsor created — finish setup in{' '}
          <Link to="/admin/sponsors" className="font-semibold underline hover:no-underline">Admin → Sponsors</Link>.
        </div>
      )}
      <div className="mt-4 grid gap-3.5">
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} w-full`}>
            {STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
        </Field>
        <Field label="Internal notes" hint="Only visible to admins">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes about this lead…" className={`${inputCls} resize-y`} />
        </Field>
      </div>
    </Modal>
  );
}

export default function PartnerLeads() {
  const { pushToast } = useApp();
  const [tab, setTab] = useState('');
  const [rows, setRows] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = useCallback(() => {
    setRows(null);
    api.adminPartnerApplications(tab ? { status: tab } : undefined)
      .then(setRows)
      .catch((e) => { setRows([]); pushToast(apiError(e), false); });
  }, [tab, pushToast]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'org', label: 'Organization' },
    { key: 'contact', label: 'Contact' },
    { key: 'interest', label: 'Interest' },
    { key: 'received', label: 'Received' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', align: 'right' },
  ];

  const renderCell = (a, key) => {
    switch (key) {
      case 'org':
        return (
          <div>
            <div className="font-semibold text-[#111827]">{a.orgName}</div>
            {a.website && <div className="text-[12px] text-[#6B7280]">{a.website}</div>}
          </div>
        );
      case 'contact':
        return (
          <div>
            <div className="text-[#4B5563]">{a.contactName}</div>
            <div className="text-[12px] text-[#6B7280]">{a.email}</div>
          </div>
        );
      case 'interest':
        return a.interestTier ? <Pill tone="gray">{sponsorTierLabel(a.interestTier)}</Pill> : <span className="text-[#6B7280]">—</span>;
      case 'received':
        return <span className="text-[#4B5563]">{fmtDate(a.createdAt)}</span>;
      case 'status':
        return <Pill tone={statusTone(a.status)}>{cap(a.status)}</Pill>;
      case 'actions':
        return <Btn size="sm" variant="ghost" onClick={() => setActive(a)}>Manage</Btn>;
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead
        title="Partner leads"
        subtitle={rows ? `${rows.length} ${tab ? cap(tab).toLowerCase() : 'total'}` : 'Sponsor & partner inquiries'}
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {rows === null ? (
        <Loading />
      ) : (
        <Table columns={columns} rows={rows} renderCell={renderCell} empty="No leads here yet. They arrive via the “Become a partner” form." />
      )}
      {active && <LeadDrawer lead={active} onClose={() => setActive(null)} onSaved={() => { setActive(null); load(); }} />}
    </div>
  );
}
