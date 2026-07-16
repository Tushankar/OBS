import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Tabs, Loading, Modal, Avatar } from '../../components/portal/Kit';
import ReasonDialog from '../../components/admin/ReasonDialog';

const TABS = [
  ['PENDING', 'Pending'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
  ['ALL', 'All'],
];

const ORG_TYPE_LABELS = {
  COMPANY: 'Company / Agency',
  NONPROFIT: 'Non-profit / NGO',
  COMMUNITY: 'Community / Club',
  EDUCATION: 'Education / Institute',
  INDIVIDUAL: 'Individual organizer',
};
const EXPERIENCE_LABELS = {
  FIRST_TIME: 'First-time organizer',
  UPTO_5: '1–5 events organized',
  UPTO_20: '6–20 events organized',
  OVER_20: '20+ events organized',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const href = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

// Full application drill-down — everything the applicant submitted, with the
// approve/reject decision available right from the review.
function ApplicationModal({ org, busy, onClose, onApprove, onReject }) {
  const rows = [
    ['Organization type', org.orgType ? ORG_TYPE_LABELS[org.orgType] || org.orgType : '—'],
    ['City', org.city || '—'],
    ['Contact person', org.contactName || '—'],
    ['Phone', org.phone || '—'],
    ['Applicant account', org.user ? `${org.user.name} · ${org.user.email}` : '—'],
    ['Event experience', org.experience ? EXPERIENCE_LABELS[org.experience] || org.experience : '—'],
    ['Registration / GST no.', org.registrationNo || '—'],
    ['Applied', fmtDate(org.appliedAt)],
  ];
  return (
    <Modal
      open
      onClose={onClose}
      title={org.orgName}
      subtitle={`Organizer application · ${org.status}`}
      width="max-w-2xl"
      footer={
        org.status === 'PENDING' ? (
          <>
            <Btn variant="ghost" onClick={onReject} disabled={busy} className="!text-red-700">Reject…</Btn>
            <Btn onClick={onApprove} disabled={busy}>{busy ? 'Working…' : 'Approve organizer'}</Btn>
          </>
        ) : (
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={org.orgName} src={org.logoUrl} size={44} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{org.orgName}</span>
              <Pill tone={statusTone(org.status)}>{org.status}</Pill>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-3 text-xs">
              {org.website && <a href={href(org.website)} target="_blank" rel="noreferrer" className="font-medium text-[#E5B700] hover:opacity-80">Website ↗</a>}
              {org.socialUrl && <a href={href(org.socialUrl)} target="_blank" rel="noreferrer" className="font-medium text-[#E5B700] hover:opacity-80">LinkedIn / Instagram ↗</a>}
              {org.phone && <a href={`tel:${org.phone}`} className="font-medium text-gray-500 hover:text-gray-800">{org.phone}</a>}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-1 overflow-hidden rounded-lg border border-gray-200 sm:grid-cols-2">
          {rows.map(([label, value], i) => (
            <div key={label} className={`px-4 py-2.5 ${i > 1 ? 'border-t border-gray-100' : i === 1 ? 'border-t border-gray-100 sm:border-t-0' : ''} ${i % 2 === 1 ? 'sm:border-l sm:border-gray-100' : ''}`}>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</dt>
              <dd className="mt-0.5 text-sm text-gray-800">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">About their events</div>
          <p className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
            {org.bio || 'No description provided (submitted before detailed applications were required).'}
          </p>
        </div>

        {org.status === 'REJECTED' && org.rejectionReason && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-red-400">Rejection reason (sent to applicant)</div>
            <p className="mt-0.5 text-sm text-red-800">{org.rejectionReason}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Organizers() {
  const { pushToast } = useApp();
  const [tab, setTab] = useState('PENDING');
  const [orgs, setOrgs] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // organizer pending rejection
  const [detail, setDetail] = useState(null); // application drill-down

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = useCallback(() => {
    setOrgs(null);
    const params = tab === 'ALL' ? undefined : { status: tab };
    api.adminOrganizers(params)
      .then((d) => setOrgs(d || []))
      .catch((e) => { setOrgs([]); pushToast(apiError(e), false); });
  }, [tab, pushToast]);

  useEffect(() => { load(); }, [load]);

  async function approve(o) {
    setBusyId(o.id);
    try {
      await api.approveOrganizer(o.id);
      pushToast(`Approved ${o.orgName}`);
      setDetail(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Action failed'), false);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(reason) {
    const o = rejecting;
    setBusyId(o.id);
    try {
      await api.rejectOrganizer(o.id, reason || undefined);
      pushToast(`Rejected ${o.orgName}`);
      setRejecting(null);
      setDetail(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Action failed'), false);
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: 'org', label: 'Organizer' },
    { key: 'contact', label: 'Contact' },
    { key: 'type', label: 'Type · City' },
    { key: 'status', label: 'Status' },
    { key: 'applied', label: 'Applied' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  const renderCell = (o, key) => {
    switch (key) {
      case 'org':
        return (
          <button onClick={() => setDetail(o)} className="text-left">
            <div className="font-semibold text-gray-900 transition-colors hover:text-[#B58C1F]">{o.orgName}</div>
            <div className="text-xs text-gray-500">
              {o.user?.email || '—'}{o.website ? ` · ${o.website}` : ''}
            </div>
          </button>
        );
      case 'contact':
        return (
          <div className="min-w-0">
            <div className="truncate text-sm text-gray-800">{o.contactName || '—'}</div>
            <div className="truncate text-xs text-gray-500">{o.phone || ''}</div>
          </div>
        );
      case 'type':
        return (
          <span className="text-sm text-gray-600">
            {o.orgType ? (ORG_TYPE_LABELS[o.orgType] || o.orgType).split(' /')[0] : '—'}{o.city ? ` · ${o.city}` : ''}
          </span>
        );
      case 'status':
        return <Pill tone={statusTone(o.status)}>{o.status}</Pill>;
      case 'applied':
        return <span className="text-gray-600">{fmtDate(o.appliedAt)}</span>;
      case 'actions':
        if (o.status === 'PENDING') {
          return (
            <div className="flex justify-end gap-2">
              <Btn size="sm" variant="ghost" disabled={busyId === o.id} onClick={() => setDetail(o)}>Review</Btn>
              <Btn size="sm" disabled={busyId === o.id} onClick={() => approve(o)}>Approve</Btn>
              <Btn size="sm" variant="ghost" disabled={busyId === o.id} onClick={() => setRejecting(o)} className="!text-red-700">Reject</Btn>
            </div>
          );
        }
        return <Btn size="sm" variant="ghost" onClick={() => setDetail(o)}>View</Btn>;
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead
        title="Organizers"
        subtitle={orgs ? `${orgs.length} ${tab === 'ALL' ? 'total' : tab.toLowerCase()}` : 'Review organizer applications.'}
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {orgs === null ? (
        <Loading />
      ) : (
        <Table columns={columns} rows={orgs} renderCell={renderCell} empty="No organizer applications here." />
      )}

      {detail && (
        <ApplicationModal
          org={detail}
          busy={busyId === detail.id}
          onClose={() => setDetail(null)}
          onApprove={() => approve(detail)}
          onReject={() => setRejecting(detail)}
        />
      )}

      <ReasonDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        onSubmit={reject}
        busy={busyId === rejecting?.id}
        required={false}
        title={`Reject ${rejecting?.orgName || ''}`}
        subtitle="The applicant is emailed about this decision."
        label="Reason (optional)"
        placeholder="e.g. We couldn’t verify the organization details."
        confirmLabel="Reject application"
      />
    </div>
  );
}
