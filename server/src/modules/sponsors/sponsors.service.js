import { Sponsor, PartnerApplication, Event } from '../../models/index.js';
import { notFoundError } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { uniqueSlug } from '../../utils/slugify.js';

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
    sortOrder: s.sortOrder || 0,
    isActive: s.isActive,
  };
}

// GET /sponsors ?scope &tier — the public showcase (defaults to PLATFORM scope;
// EVENT/PROGRAM sponsors render on their own pages). Client groups by tier.
export async function listSponsors({ scope, tier } = {}) {
  const filter = { isActive: true, scope: scope || 'PLATFORM' };
  if (tier) filter.tier = tier;
  const rows = await Sponsor.find(filter).sort({ sortOrder: 1, name: 1 });
  return rows.map(shapeSponsor);
}

// Event-scoped sponsors (also embedded in the event detail payload).
export async function sponsorsForEvent(eventId) {
  const rows = await Sponsor.find({ eventId, isActive: true }).sort({ sortOrder: 1, name: 1 });
  return rows.map(shapeSponsor);
}

export async function sponsorsForEventSlug(slug) {
  const event = await Event.findOne({ slug }).select('_id');
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  return sponsorsForEvent(event._id);
}

// ---- Admin sponsor CRUD ----
export async function adminListSponsors() {
  return (await Sponsor.find({}).sort({ scope: 1, sortOrder: 1, name: 1 })).map(shapeSponsor);
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
  if (body.name && body.name !== sponsor.name) { sponsor.name = body.name; sponsor.slug = await uniqueSlug(Sponsor, body.name, { ignoreId: sponsor._id }); }
  for (const f of ['logoUrl', 'website', 'tier', 'scope', 'eventId', 'programId', 'blurb', 'sortOrder', 'isActive']) {
    if (body[f] !== undefined) sponsor[f] = body[f];
  }
  await sponsor.save();
  await writeAudit({ actorId: adminId, action: 'SPONSOR_UPDATED', entityType: 'Sponsor', entityId: sponsor._id, meta: { name: sponsor.name } });
  return shapeSponsor(sponsor);
}
export async function deleteSponsor(adminId, id) {
  const sponsor = await Sponsor.findById(id);
  if (!sponsor) throw notFoundError('SPONSOR_NOT_FOUND', 'Sponsor not found');
  await sponsor.deleteOne();
  await writeAudit({ actorId: adminId, action: 'SPONSOR_DELETED', entityType: 'Sponsor', entityId: id, meta: { name: sponsor.name } });
  return { ok: true };
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
