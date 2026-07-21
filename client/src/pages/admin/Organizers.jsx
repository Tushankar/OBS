import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Tabs, Loading, Modal, Avatar, Field, inputCls, selectCls, Card, SearchInput } from '../../components/portal/Kit';
import ReasonDialog from '../../components/admin/ReasonDialog';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { useAdminCounts } from '../../components/admin/AdminCounts';

// Approved first (the day-to-day roster); Pending carries a live count badge.
const TAB_DEFS = [
  ['APPROVED', 'Approved'],
  ['PENDING', 'Pending'],
  ['REJECTED', 'Rejected'],
  ['SUSPENDED', 'Suspended'],
  ['ALL', 'All'],
];
const PAGE_SIZE = 25;

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

const EMPTY_ORG = { orgName: '', contactName: '', email: '', phone: '', orgType: 'COMPANY', city: '', experience: 'FIRST_TIME', website: '', socialUrl: '', registrationNo: '', bio: '' };

// Admin-created organizer. Same fields as the public application form, plus the
// login email — the account is created approved and its password is emailed.
function CreateOrganizerModal({ onClose, onCreated }) {
  const { pushToast } = useApp();
  const [form, setForm] = useState(EMPTY_ORG);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    // Light client checks; the server enforces the full application rules.
    if (form.orgName.trim().length < 2) return pushToast('Organization name is required', false);
    if (form.contactName.trim().length < 2) return pushToast('Contact person is required', false);
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return pushToast('Enter a valid login email', false);
    if (form.city.trim().length < 2) return pushToast('City is required', false);
    if (form.bio.trim().length < 30) return pushToast('Add a short description (at least 30 characters)', false);
    setBusy(true);
    try {
      const org = await api.adminCreateOrganizer({
        orgName: form.orgName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        orgType: form.orgType,
        city: form.city.trim(),
        experience: form.experience,
        bio: form.bio.trim(),
        website: form.website.trim() || undefined,
        socialUrl: form.socialUrl.trim() || undefined,
        registrationNo: form.registrationNo.trim() || undefined,
      });
      pushToast(`Created ${org.orgName} — login details emailed to ${org.user?.email || form.email.trim()}`);
      onCreated();
    } catch (e) {
      pushToast(apiError(e, 'Could not create organizer'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add organizer"
      subtitle="Creates an approved organizer account and emails the login details."
      width="max-w-2xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy ? 'Creating…' : 'Create & email login'}</Btn>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Organization name"><input className={inputCls} value={form.orgName} onChange={(e) => set('orgName', e.target.value)} placeholder="e.g. Skyline Events Co." /></Field></div>
        <Field label="Contact person"><input className={inputCls} value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Full name" /></Field>
        <Field label="Login email"><input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="organizer@company.com" /></Field>
        <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+971 50 123 4567" /></Field>
        <Field label="City"><input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Dubai" /></Field>
        <Field label="Organization type">
          <select className={`${selectCls} w-full`} value={form.orgType} onChange={(e) => set('orgType', e.target.value)}>
            {Object.entries(ORG_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Event experience">
          <select className={`${selectCls} w-full`} value={form.experience} onChange={(e) => set('experience', e.target.value)}>
            {Object.entries(EXPERIENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Website (optional)"><input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="company.com" /></Field>
        <Field label="LinkedIn / Instagram (optional)"><input className={inputCls} value={form.socialUrl} onChange={(e) => set('socialUrl', e.target.value)} placeholder="linkedin.com/company/…" /></Field>
        <div className="sm:col-span-2"><Field label="Registration / GST no. (optional)"><input className={inputCls} value={form.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="About their events"><textarea rows={4} className={`${inputCls} resize-y`} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="What kind of events do they run? (min 30 characters)" /></Field></div>
      </div>
    </Modal>
  );
}

export default function Organizers() {
  const { pushToast } = useApp();
  const { refresh: refreshCounts } = useAdminCounts(); // sidebar/tab badges
  const [tab, setTab] = useState('APPROVED'); // approved-first
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [data, setData] = useState(null); // { organizers, total, page, pages, counts }
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // organizer pending rejection
  const [detail, setDetail] = useState(null); // application drill-down
  const [creating, setCreating] = useState(false); // admin add-organizer modal

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const buildParams = useCallback((pg) => ({
    ...(tab !== 'ALL' ? { status: tab } : {}),
    ...(debounced ? { q: debounced } : {}),
    page: pg,
    limit: PAGE_SIZE,
  }), [tab, debounced]);

  const load = useCallback(() => {
    setData(null);
    setPage(1);
    api.adminOrganizers(buildParams(1))
      .then(setData)
      .catch((e) => { setData({ organizers: [], total: 0, pages: 0, counts: {} }); pushToast(apiError(e), false); });
  }, [buildParams, pushToast]);

  useEffect(() => { load(); }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const d = await api.adminOrganizers(buildParams(next));
      setData((cur) => ({ ...d, organizers: [...cur.organizers, ...d.organizers] }));
      setPage(next);
    } catch (e) { pushToast(apiError(e, 'Could not load more'), false); } finally { setLoadingMore(false); }
  }

  async function approve(o) {
    setBusyId(o.id);
    try {
      await api.approveOrganizer(o.id);
      pushToast(`Approved ${o.orgName}`);
      setDetail(null);
      load();
      refreshCounts(); // pending badge drops immediately
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
      refreshCounts();
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

  // Tab labels carry live per-status counts — Pending shows its queue size
  // even while you're on another tab.
  const counts = data?.counts || {};
  const tabs = TAB_DEFS.map(([key, label]) => [key, counts[key] ? `${label} (${counts[key]})` : label]);
  const rows = data?.organizers || [];

  return (
    <div>
      <PageHead
        title="Organizers"
        subtitle={data ? `${data.total} ${tab === 'ALL' ? 'total' : tab.toLowerCase()}` : 'Review organizer applications.'}
        actions={<Btn onClick={() => setCreating(true)}><AdminIcon.Plus size={15} /> Add organizer</Btn>}
      />
      <Card className="mb-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Search organization, contact or city…" className="max-w-xs" />
      </Card>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {data === null ? (
        <Loading />
      ) : (
        <>
          <Table columns={columns} rows={rows} renderCell={renderCell} empty="No organizer applications here." />
          {rows.length < (data.total || 0) && (
            <div className="mt-4 text-center">
              <Btn variant="ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load more (${data.total - rows.length} left)`}
              </Btn>
            </div>
          )}
        </>
      )}

      {creating && (
        <CreateOrganizerModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); if (tab === 'APPROVED') load(); else setTab('APPROVED'); }}
        />
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
