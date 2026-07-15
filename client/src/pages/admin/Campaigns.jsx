/* Hallmark · modern-minimal · admin — email campaigns (CRM).
 * Announcement blasts: pick an event to feature (prefills the copy + adds a
 * "View event & book" CTA in the mail), choose the audience, send. Every
 * recipient send is audited in the Email log. Honest counts, no fabrication.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import {
  PageHead, Card, Btn, Pill, Modal, ConfirmDialog, Field,
  inputCls, selectCls, statusTone, Loading, EmptyState,
} from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { fmtDateTime } from '../../lib/format';

const AUDIENCE_LABEL = { ALL_USERS: 'All users', EVENT_ATTENDEES: 'Attendees of an event' };
const num = (n) => Number(n || 0).toLocaleString('en-IN');

function CampaignEditor({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const editing = !!initial?.id;
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    subject: initial?.subject || '',
    body: initial?.body || '',
    eventId: initial?.eventId || '',
    audience: initial?.audience || 'ALL_USERS',
    audienceEventId: initial?.audienceEventId || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.adminEvents({ limit: 100 }).then((d) => setEvents(d.events || [])).catch(() => setEvents([]));
  }, []);

  // Picking a featured event prefills empty subject/body — the "new event
  // launched → announce it" one-click flow.
  const pickEvent = (id) => {
    const ev = events.find((e) => e.id === id);
    setForm((f) => ({
      ...f,
      eventId: id,
      subject: f.subject || (ev ? `New on OBS: ${ev.title}` : f.subject),
      body: f.body || (ev ? `We've just opened bookings for ${ev.title}.\n\nSeats are limited — grab yours before they're gone.` : f.body),
    }));
  };

  const save = async (thenSend = false) => {
    if (form.subject.trim().length < 3) { pushToast('Enter a subject', false); return; }
    if (form.body.trim().length < 10) { pushToast('Write the message (at least 10 characters)', false); return; }
    if (form.audience === 'EVENT_ATTENDEES' && !form.audienceEventId) { pushToast('Pick the event whose attendees should receive this', false); return; }
    const body = {
      subject: form.subject.trim(),
      body: form.body.trim(),
      eventId: form.eventId || null,
      audience: form.audience,
      audienceEventId: form.audience === 'EVENT_ATTENDEES' ? form.audienceEventId : null,
    };
    setBusy(true);
    try {
      const saved = editing ? await api.updateCampaign(initial.id, body) : await api.createCampaign(body);
      pushToast(editing ? 'Campaign updated' : 'Draft saved');
      onSaved(saved, thenSend);
    } catch (e) {
      pushToast(apiError(e, 'Could not save campaign'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={editing ? 'Edit campaign' : 'New campaign'}
      subtitle="Drafts can be edited freely; sending is final and every delivery is logged."
      width="max-w-xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant="outline" onClick={() => save(false)} disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</Btn>
          <Btn onClick={() => save(true)} disabled={busy}>{busy ? 'Saving…' : 'Save & send…'}</Btn>
        </>
      }
    >
      <div className="grid gap-3.5">
        <Field label="Feature an event" hint="Optional — prefills the copy and adds a “View event & book” button to the email.">
          <select value={form.eventId} onChange={(e) => pickEvent(e.target.value)} className={`${selectCls} w-full`}>
            <option value="">No featured event</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </Field>
        <Field label="Subject">
          <input value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="New on OBS: …" className={inputCls} />
        </Field>
        <Field label="Message" hint="Plain text — blank line starts a new paragraph.">
          <textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={6} placeholder="What do you want to tell them?" className={`${inputCls} resize-y`} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Audience">
            <select value={form.audience} onChange={(e) => set('audience', e.target.value)} className={`${selectCls} w-full`}>
              <option value="ALL_USERS">All active users</option>
              <option value="EVENT_ATTENDEES">Attendees of an event</option>
            </select>
          </Field>
          {form.audience === 'EVENT_ATTENDEES' && (
            <Field label="Whose attendees?">
              <select value={form.audienceEventId} onChange={(e) => set('audienceEventId', e.target.value)} className={`${selectCls} w-full`}>
                <option value="">Select an event…</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </Field>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function Campaigns() {
  const { pushToast } = useApp();
  const [rows, setRows] = useState(null);
  const [editor, setEditor] = useState(null); // {} = new, row = edit
  const [confirmSend, setConfirmSend] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.adminCampaigns().then(setRows).catch((e) => { setRows([]); pushToast(apiError(e), false); });
  useEffect(() => { window.scrollTo(0, 0); load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setBusy(true);
    try {
      const sent = await api.sendCampaign(confirmSend.id);
      pushToast(`Sent to ${num(sent.sentCount)} of ${num(sent.recipientCount)} recipients${sent.failedCount ? ` · ${num(sent.failedCount)} failed` : ''}`);
      setConfirmSend(null);
      load();
    } catch (e) { pushToast(apiError(e, 'Could not send'), false); }
    finally { setBusy(false); }
  };

  const del = async () => {
    setBusy(true);
    try { await api.deleteCampaign(confirmDelete.id); pushToast('Draft deleted'); setConfirmDelete(null); load(); }
    catch (e) { pushToast(apiError(e), false); }
    finally { setBusy(false); }
  };

  if (rows === null) return <Loading />;

  return (
    <div>
      <PageHead
        title="Campaigns"
        subtitle="Announcement emails — launch a new event to your audience. Deliveries are audited in the Email log."
        actions={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New campaign</Btn>}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<AdminIcon.Mail size={30} />}
          title="No campaigns yet"
          subtitle="Announce a new event to all users, or message a past event's attendees."
          action={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New campaign</Btn>}
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14.5px] font-semibold text-[#1A1F36]">{c.subject}</span>
                  <Pill tone={statusTone(c.status === 'SENT' ? 'COMPLETED' : c.status === 'SENDING' ? 'PENDING' : 'DRAFT')}>{c.status}</Pill>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-[#697386]">
                  <span>To: {AUDIENCE_LABEL[c.audience]}{c.audienceEventTitle ? ` · ${c.audienceEventTitle}` : ''}</span>
                  {c.eventTitle && <span>Features: {c.eventTitle}</span>}
                  {c.status === 'SENT' && (
                    <span className="[font-variant-numeric:tabular-nums]">
                      {num(c.sentCount)}/{num(c.recipientCount)} delivered{c.failedCount ? ` · ${num(c.failedCount)} failed` : ''} · {fmtDateTime(c.sentAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {c.status === 'DRAFT' && (
                  <>
                    <Btn size="sm" onClick={() => setConfirmSend(c)}>Send</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setEditor(c)}>Edit</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setConfirmDelete(c)} className="!text-[#B3093C]"><AdminIcon.Trash size={13} /></Btn>
                  </>
                )}
                {c.status === 'SENT' && (
                  <Link to="/admin/emails" className="text-[13px] font-semibold text-brand-dark hover:underline">View deliveries →</Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && (
        <CampaignEditor
          initial={editor.id ? editor : null}
          onClose={() => setEditor(null)}
          onSaved={(saved, thenSend) => { setEditor(null); load(); if (thenSend) setConfirmSend(saved); }}
        />
      )}
      <ConfirmDialog
        open={!!confirmSend}
        onClose={() => setConfirmSend(null)}
        onConfirm={send}
        busy={busy}
        title="Send campaign"
        body={confirmSend ? `Send “${confirmSend.subject}” to ${confirmSend.audience === 'ALL_USERS' ? 'ALL active users' : `attendees of ${confirmSend.audienceEventTitle || 'the selected event'}`}? This can't be undone.` : ''}
        confirmLabel="Send now"
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={del}
        busy={busy}
        danger
        title="Delete draft"
        body={confirmDelete ? `Delete the draft “${confirmDelete.subject}”?` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}
