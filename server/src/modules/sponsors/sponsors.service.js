import { Sponsor, PartnerApplication, Event, OrganizerProfile } from '../../models/index.js';
import { notFoundError } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { notifyAdmins, notifyUser } from '../notifications/notifications.service.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { publicEventCard, loadOwnedEvent } from '../events/events.service.js';

const VIEWABLE = ['PUBLISHED', 'COMPLETED'];
const pick = (obj, keys) => keys.reduce((o, k) => (obj[k] !== undefined ? ((o[k] = obj[k]), o) : o), {});

export function shapeSponsor(s) {
  return {
    id: String(s._id),
    name: s.name,
    slug: s.slug,
    logoUrl: s.logoUrl || null,
    website: s.website || null,
    tier: s.tier,
    scope: s.scope,
    blurb: s.blurb || null,
    eventId: s.eventId ? String(s.eventId) : null,
    programId: s.programId ? String(s.programId) : null,
    status: s.status || 'APPROVED',
    organizerId: s.organizerId ? String(s.organizerId) : null,
    sortOrder: s.sortOrder || 0,
    isActive: s.isActive,
  };
}

// GET /sponsors ?scope &tier — the public showcase (defaults to PLATFORM scope;
// EVENT/PROGRAM sponsors render on their own pages). Client groups by tier.
export async function listSponsors({ scope, tier } = {}) {
  const filter = { isActive: true, status: 'APPROVED', scope: scope || 'PLATFORM' };
  if (tier) filter.tier = tier;
  const rows = await Sponsor.find(filter).sort({ sortOrder: 1, name: 1 });
  return rows.map(shapeSponsor);
}

// Event-scoped sponsors (also embedded in the event detail payload). Only
// approved sponsors are public — a pending organizer submission stays hidden.
export async function sponsorsForEvent(eventId) {
  const rows = await Sponsor.find({ eventId, isActive: true, status: 'APPROVED' }).sort({ sortOrder: 1, name: 1 });
  return rows.map(shapeSponsor);
}

export async function sponsorsForEventSlug(slug) {
  const event = await Event.findOne({ slug }).select('_id');
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  return sponsorsForEvent(event._id);
}

// GET /sponsors/:slug — on-platform sponsor profile + the events they support.
// The event list follows the sponsor's scope: an EVENT sponsor supports its one
// event, a PROGRAM sponsor supports that season's events, a PLATFORM sponsor
// supports the whole network (no single event list — the profile says so).
export async function getSponsorBySlug(slug) {
  const sponsor = await Sponsor.findOne({ slug, isActive: true, status: 'APPROVED' });
  if (!sponsor) throw notFoundError('SPONSOR_NOT_FOUND', 'Sponsor not found');

  let events = [];
  const populate = (q) => q.populate('categoryId', 'name slug').populate('chapterId', 'name slug flagEmoji countryCode');
  if (sponsor.scope === 'EVENT' && sponsor.eventId) {
    events = await populate(Event.find({ _id: sponsor.eventId, status: { $in: VIEWABLE } }));
  } else if (sponsor.scope === 'PROGRAM' && sponsor.programId) {
    events = await populate(Event.find({ programId: sponsor.programId, status: { $in: VIEWABLE } }).sort({ startAt: 1 }));
  }
  return { sponsor: shapeSponsor(sponsor), events: events.map(publicEventCard) };
}

// ---- Admin sponsor CRUD ----
export async function adminListSponsors() {
  // Excludes organizer library templates (scope EVENT with no eventId) — those
  // only become reviewable once attached to an event.
  const filter = { $nor: [{ scope: 'EVENT', eventId: null, organizerId: { $ne: null } }] };
  return (await Sponsor.find(filter).sort({ scope: 1, sortOrder: 1, name: 1 })).map(shapeSponsor);
}
export async function createSponsor(adminId, body) {
  const slug = await uniqueSlug(Sponsor, body.name);
  const sponsor = await Sponsor.create({ ...body, slug });
  await writeAudit({ actorId: adminId, action: 'SPONSOR_CREATED', entityType: 'Sponsor', entityId: sponsor._id, meta: { name: sponsor.name } });
  return shapeSponsor(sponsor);
}
export async function updateSponsor(adminId, id, body) {
  const sponsor = await Sponsor.findById(id);
  if (!sponsor) throw notFoundError('SPONSOR_NOT_FOUND', 'Sponsor not found');
  const prevStatus = sponsor.status;
  if (body.name && body.name !== sponsor.name) { sponsor.name = body.name; sponsor.slug = await uniqueSlug(Sponsor, body.name, { ignoreId: sponsor._id }); }
  for (const f of ['logoUrl', 'website', 'tier', 'scope', 'eventId', 'programId', 'blurb', 'sortOrder', 'isActive', 'status']) {
    if (body[f] !== undefined) sponsor[f] = body[f];
  }
  await sponsor.save();
  await writeAudit({ actorId: adminId, action: 'SPONSOR_UPDATED', entityType: 'Sponsor', entityId: sponsor._id, meta: { name: sponsor.name } });

  // Organizer bell — the submitter hears the decision on their event sponsor.
  if (sponsor.organizerId && body.status && body.status !== prevStatus && ['APPROVED', 'REJECTED'].includes(body.status)) {
    const orgProfile = await OrganizerProfile.findById(sponsor.organizerId).select('userId').catch(() => null);
    await notifyUser({
      userId: orgProfile?.userId,
      type: body.status === 'APPROVED' ? 'EVENT_SPONSOR_APPROVED' : 'EVENT_SPONSOR_REJECTED',
      title: `Sponsor “${sponsor.name}” ${body.status === 'APPROVED' ? 'approved' : 'rejected'}`,
      body: body.status === 'APPROVED' ? 'It now shows on your event page.' : 'It will not appear on your event page.',
      link: '/organizer/sponsors',
      entityType: 'Sponsor',
      entityId: sponsor._id,
    });
  }
  return shapeSponsor(sponsor);
}
export async function deleteSponsor(adminId, id) {
  const sponsor = await Sponsor.findById(id);
  if (!sponsor) throw notFoundError('SPONSOR_NOT_FOUND', 'Sponsor not found');
  await sponsor.deleteOne();
  await writeAudit({ actorId: adminId, action: 'SPONSOR_DELETED', entityType: 'Sponsor', entityId: id, meta: { name: sponsor.name } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Organizer-submitted EVENT sponsors. An organizer adds sponsors to their own
// event; each is created scope=EVENT + status=PENDING and only appears publicly
// once an admin approves it. Editing an approved sponsor sends it back to
// PENDING (so a swapped logo/name is re-checked).
// ---------------------------------------------------------------------------
const ORG_SPONSOR_FIELDS = ['name', 'logoUrl', 'website', 'tier', 'blurb'];

// ---- Organizer sponsor library — reusable sponsor profiles owned by one ----
// ---- organizer, not tied to any event. Attaching one to an event copies ----
// ---- it into a normal (admin-reviewed) event sponsor. Never public. ----
export async function listSponsorLibrary(organizerId) {
  const rows = await Sponsor.find({ organizerId, scope: 'EVENT', eventId: null }).sort({ name: 1 });
  return rows.map(shapeSponsor);
}

async function loadLibrarySponsor(organizerId, id) {
  const sponsor = await Sponsor.findOne({ _id: id, organizerId, scope: 'EVENT', eventId: null });
  if (!sponsor) throw notFoundError('SPONSOR_NOT_FOUND', 'Sponsor not found');
  return sponsor;
}

export async function createLibrarySponsor(organizerId, body) {
  const slug = await uniqueSlug(Sponsor, body.name);
  const sponsor = await Sponsor.create({
    ...pick(body, ORG_SPONSOR_FIELDS),
    slug,
    scope: 'EVENT',
    eventId: null,
    organizerId,
    status: 'APPROVED', // library entries are private; review happens per event
    isActive: true,
  });
  return shapeSponsor(sponsor);
}

export async function updateLibrarySponsor(organizerId, id, body) {
  const sponsor = await loadLibrarySponsor(organizerId, id);
  for (const f of ORG_SPONSOR_FIELDS) {
    if (body[f] !== undefined) sponsor[f] = body[f];
  }
  await sponsor.save();
  return shapeSponsor(sponsor);
}

export async function deleteLibrarySponsor(organizerId, id) {
  const sponsor = await loadLibrarySponsor(organizerId, id);
  await sponsor.deleteOne();
  return { ok: true };
}

export async function listEventSponsors(organizerId, eventId) {
  await loadOwnedEvent(organizerId, eventId);
  const rows = await Sponsor.find({ eventId, scope: 'EVENT' }).sort({ sortOrder: 1, name: 1 });
  return rows.map(shapeSponsor);
}

export async function createEventSponsor(organizerId, eventId, body) {
  await loadOwnedEvent(organizerId, eventId);
  const slug = await uniqueSlug(Sponsor, body.name);
  const sponsor = await Sponsor.create({
    ...pick(body, ORG_SPONSOR_FIELDS),
    slug,
    scope: 'EVENT',
    eventId,
    organizerId,
    status: 'PENDING',
    isActive: true,
  });
  await writeAudit({ actorId: organizerId, action: 'SPONSOR_SUBMITTED', entityType: 'Sponsor', entityId: sponsor._id, meta: { name: sponsor.name, eventId: String(eventId) } });
  await notifyAdmins({
    type: 'EVENT_SPONSOR_PENDING',
    title: `Event sponsor awaiting approval: ${sponsor.name}`,
    body: 'An organizer submitted a sponsor for their event.',
    link: '/admin/sponsors',
    entityType: 'Sponsor',
    entityId: sponsor._id,
  });
  return shapeSponsor(sponsor);
}

async function loadOwnedEventSponsor(organizerId, eventId, id) {
  await loadOwnedEvent(organizerId, eventId);
  const sponsor = await Sponsor.findOne({ _id: id, eventId, organizerId });
  if (!sponsor) throw notFoundError('SPONSOR_NOT_FOUND', 'Sponsor not found');
  return sponsor;
}

export async function updateEventSponsor(organizerId, eventId, id, body) {
  const sponsor = await loadOwnedEventSponsor(organizerId, eventId, id);
  for (const f of ORG_SPONSOR_FIELDS) if (body[f] !== undefined) sponsor[f] = body[f];
  if (body.name && body.name !== sponsor.name) sponsor.slug = await uniqueSlug(Sponsor, body.name, { ignoreId: sponsor._id });
  // A change re-enters moderation so admins re-check what's shown.
  if (sponsor.status === 'APPROVED') sponsor.status = 'PENDING';
  await sponsor.save();
  return shapeSponsor(sponsor);
}

export async function deleteEventSponsor(organizerId, eventId, id) {
  const sponsor = await loadOwnedEventSponsor(organizerId, eventId, id);
  await sponsor.deleteOne();
  return { ok: true, id: String(sponsor._id) };
}

// ---- Partner applications ----
function shapeApplication(a) {
  return {
    id: String(a._id),
    orgName: a.orgName,
    contactName: a.contactName,
    email: a.email,
    phone: a.phone || null,
    website: a.website || null,
    interestTier: a.interestTier || null,
    message: a.message || null,
    status: a.status,
    adminNotes: a.adminNotes || null,
    sponsorId: a.sponsorId ? String(a.sponsorId) : null,
    createdAt: a.createdAt,
  };
}

// POST /partner-applications (public form → admin queue).
export async function submitApplication(body) {
  const app = await PartnerApplication.create({ ...body, status: 'NEW' });
  await notifyAdmins({
    type: 'PARTNER_LEAD',
    title: `New partner lead: ${app.orgName}`,
    body: `${app.contactName} (${app.email})`,
    link: '/admin/partner-leads',
    entityType: 'PartnerApplication',
    entityId: app._id,
  });
  return shapeApplication(app);
}
export async function adminListApplications({ status } = {}) {
  const filter = status ? { status } : {};
  return (await PartnerApplication.find(filter).sort({ createdAt: -1 })).map(shapeApplication);
}
// Approval must produce a visible next step: a hidden draft Sponsor the admin
// finishes in Admin → Sponsors. Idempotent via the sponsorId back-reference.
async function draftSponsorFromApplication(adminId, app) {
  const slug = await uniqueSlug(Sponsor, app.orgName);
  const website = app.website
    ? (/^https?:\/\//i.test(app.website) ? app.website : `https://${app.website}`)
    : undefined;
  const sponsor = await Sponsor.create({
    name: app.orgName,
    slug,
    website,
    tier: app.interestTier || 'PARTNER',
    scope: 'PLATFORM',
    isActive: false,
  });
  await writeAudit({ actorId: adminId, action: 'SPONSOR_CREATED', entityType: 'Sponsor', entityId: sponsor._id, meta: { name: sponsor.name, fromApplication: String(app._id) } });
  return sponsor;
}

export async function updateApplication(adminId, id, { status, adminNotes }) {
  const app = await PartnerApplication.findById(id);
  if (!app) throw notFoundError('APPLICATION_NOT_FOUND', 'Application not found');
  if (status !== undefined) app.status = status;
  if (adminNotes !== undefined) app.adminNotes = adminNotes;
  if (app.status === 'APPROVED' && !app.sponsorId) {
    const sponsor = await draftSponsorFromApplication(adminId, app);
    app.sponsorId = sponsor._id;
  }
  await app.save();
  await writeAudit({ actorId: adminId, action: 'PARTNER_APPLICATION_UPDATED', entityType: 'PartnerApplication', entityId: app._id, meta: { status: app.status } });
  return shapeApplication(app);
}
