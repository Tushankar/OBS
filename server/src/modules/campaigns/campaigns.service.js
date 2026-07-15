import { Campaign, User, Event, Ticket } from '../../models/index.js';
import { env } from '../../config/env.js';
import { sendMail } from '../../utils/mailer.js';
import { writeAudit } from '../../utils/audit.js';
import { badRequest, conflict, notFoundError } from '../../utils/errors.js';
import { signUnsubscribeToken, verifyUnsubscribeToken } from '../../utils/tokens.js';

function shapeCampaign(c) {
  const ev = c.eventId && c.eventId._id ? c.eventId : null;
  const aud = c.audienceEventId && c.audienceEventId._id ? c.audienceEventId : null;
  return {
    id: String(c._id),
    subject: c.subject,
    body: c.body,
    eventId: c.eventId ? String(ev ? ev._id : c.eventId) : null,
    eventTitle: ev ? ev.title : null,
    audience: c.audience,
    audienceEventId: c.audienceEventId ? String(aud ? aud._id : c.audienceEventId) : null,
    audienceEventTitle: aud ? aud.title : null,
    status: c.status,
    recipientCount: c.recipientCount,
    sentCount: c.sentCount,
    failedCount: c.failedCount,
    sentAt: c.sentAt || null,
    createdAt: c.createdAt,
  };
}

const populateRefs = (q) => q.populate('eventId', 'title slug').populate('audienceEventId', 'title');

export async function listCampaigns() {
  return (await populateRefs(Campaign.find({}).sort({ createdAt: -1 }))).map(shapeCampaign);
}

function assertAudience(body) {
  if (body.audience === 'EVENT_ATTENDEES' && !body.audienceEventId) {
    throw badRequest('AUDIENCE_EVENT_REQUIRED', 'Pick the event whose attendees should receive this campaign');
  }
}

export async function createCampaign(adminId, body) {
  assertAudience(body);
  const campaign = await Campaign.create({ ...body, status: 'DRAFT', createdById: adminId });
  await writeAudit({ actorId: adminId, action: 'CAMPAIGN_CREATED', entityType: 'Campaign', entityId: campaign._id, meta: { subject: campaign.subject } });
  return shapeCampaign(await populateRefs(Campaign.findById(campaign._id)));
}

async function loadDraft(id) {
  const campaign = await Campaign.findById(id);
  if (!campaign) throw notFoundError('CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (campaign.status !== 'DRAFT') throw conflict('CAMPAIGN_NOT_DRAFT', 'A sent campaign can’t be changed — create a new one instead');
  return campaign;
}

export async function updateCampaign(adminId, id, body) {
  const campaign = await loadDraft(id);
  for (const f of ['subject', 'body', 'eventId', 'audience', 'audienceEventId']) {
    if (body[f] !== undefined) campaign[f] = body[f];
  }
  assertAudience(campaign);
  await campaign.save();
  return shapeCampaign(await populateRefs(Campaign.findById(campaign._id)));
}

export async function deleteCampaign(adminId, id) {
  const campaign = await loadDraft(id);
  await campaign.deleteOne();
  await writeAudit({ actorId: adminId, action: 'CAMPAIGN_DELETED', entityType: 'Campaign', entityId: id, meta: { subject: campaign.subject } });
  return { ok: true };
}

// ---- send ----

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Simple, mail-client-safe HTML: subject heading, body paragraphs, optional
// featured-event card with a CTA link, and a footer with a working per-recipient
// unsubscribe link (marketing-consent basic).
function renderHtml(campaign, event, unsubscribeUrl) {
  const paragraphs = escapeHtml(campaign.body).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6;">${p.replace(/\n/g, '<br/>')}</p>`).join('');
  const eventBlock = event ? `
    <div style="border:1px solid #e5e5e5;border-radius:10px;padding:16px 18px;margin:18px 0;">
      <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${escapeHtml(event.title)}</div>
      ${event.startAt ? `<div style="color:#666;font-size:13px;margin-bottom:10px;">${new Date(event.startAt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: event.timezone || 'Asia/Kolkata' })}</div>` : ''}
      <a href="${env.APP_URL}/event/${event.slug}" style="display:inline-block;background:#C99E25;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:9px 18px;border-radius:999px;">View event &amp; book</a>
    </div>` : '';
  return `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#222;">
    <h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(campaign.subject)}</h1>
    ${paragraphs}
    ${eventBlock}
    <p style="color:#999;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:22px;">
      You’re receiving this because you have an OBS Events account.
      <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a> from announcements.
    </p>
  </div>`;
}

// Resolve the audience to a de-duplicated, consent-respecting recipient list.
// Anyone with marketingOptIn=false is excluded — campaigns are marketing mail;
// transactional email is unaffected.
async function resolveRecipients(campaign) {
  if (campaign.audience === 'EVENT_ATTENDEES') {
    const tickets = await Ticket.find({ eventId: campaign.audienceEventId, status: { $in: ['VALID', 'USED'] } })
      .select('attendeeEmail attendeeName');
    const seen = new Map();
    for (const t of tickets) {
      const email = (t.attendeeEmail || '').trim().toLowerCase();
      if (email && !seen.has(email)) seen.set(email, { email, name: t.attendeeName || '' });
    }
    // Drop attendees whose account has opted out of marketing.
    const optedOut = await User.find({ email: { $in: [...seen.keys()] }, marketingOptIn: false }).select('email');
    for (const u of optedOut) seen.delete(u.email);
    return [...seen.values()];
  }
  const users = await User.find({ status: 'ACTIVE', marketingOptIn: { $ne: false } }).select('name email');
  const seen = new Map();
  for (const u of users) {
    const email = (u.email || '').trim().toLowerCase();
    if (email && !seen.has(email)) seen.set(email, { email, name: u.name || '', userId: u._id });
  }
  return [...seen.values()];
}

// One-click opt-out from the email footer link. Token is bound to the email;
// flips the matching account's marketingOptIn off.
export async function unsubscribe(token) {
  let email;
  try {
    ({ email } = verifyUnsubscribeToken(token));
  } catch {
    throw badRequest('UNSUBSCRIBE_TOKEN_INVALID', 'This unsubscribe link is invalid or has expired');
  }
  await User.updateOne({ email: email.toLowerCase() }, { $set: { marketingOptIn: false } });
  return { ok: true, email };
}

// Send a DRAFT campaign. Sequential sends keep this simple and are fine at the
// platform's current scale; every recipient gets an EmailLog row (SENT/FAILED)
// via sendMail, so the admin Email log shows exactly who got what.
export async function sendCampaign(adminId, id) {
  const campaign = await Campaign.findById(id);
  if (!campaign) throw notFoundError('CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (campaign.status !== 'DRAFT') throw conflict('CAMPAIGN_ALREADY_SENT', 'This campaign has already been sent');
  assertAudience(campaign);

  const event = campaign.eventId ? await Event.findById(campaign.eventId).select('title slug startAt timezone') : null;
  const recipients = await resolveRecipients(campaign);
  if (!recipients.length) throw badRequest('NO_RECIPIENTS', 'This audience has no reachable email addresses');

  campaign.status = 'SENDING';
  campaign.recipientCount = recipients.length;
  await campaign.save();

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    // Per-recipient render: the unsubscribe link is bound to their email.
    const unsubscribeUrl = `${env.APP_URL}/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(r.email))}`;
    const html = renderHtml(campaign, event, unsubscribeUrl);
    const text = `${campaign.subject}\n\n${campaign.body}${event ? `\n\n${event.title} — ${env.APP_URL}/event/${event.slug}` : ''}\n\nUnsubscribe from announcements: ${unsubscribeUrl}`;
    try {
      await sendMail({
        to: r.email,
        subject: campaign.subject,
        html,
        text,
        type: 'CAMPAIGN',
        userId: r.userId,
        eventId: campaign.eventId || campaign.audienceEventId || undefined,
      });
      sent += 1;
    } catch {
      failed += 1; // sendMail already logged the FAILED row with the error
    }
  }

  campaign.status = 'SENT';
  campaign.sentCount = sent;
  campaign.failedCount = failed;
  campaign.sentAt = new Date();
  await campaign.save();
  await writeAudit({ actorId: adminId, action: 'CAMPAIGN_SENT', entityType: 'Campaign', entityId: campaign._id, meta: { subject: campaign.subject, recipients: recipients.length, sent, failed } });
  return shapeCampaign(await populateRefs(Campaign.findById(campaign._id)));
}
