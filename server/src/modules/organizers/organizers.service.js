import { OrganizerProfile, Event, Ticket, Order } from '../../models/index.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { conflict, notFoundError } from '../../utils/errors.js';
import { publicEventCard } from '../events/events.service.js';

// Client-facing shape of an organizer profile (own view / admin list).
export function publicOrganizer(p) {
  return {
    id: String(p._id),
    userId: String(p.userId),
    orgName: p.orgName,
    slug: p.slug,
    logoUrl: p.logoUrl || null,
    bio: p.bio || null,
    website: p.website || null,
    status: p.status,
    approvedAt: p.approvedAt || null,
    createdAt: p.createdAt,
  };
}

// A signed-in USER applies to become an organizer. Creates a PENDING profile.
// The user's role stays USER until an admin approves (see admin.service). A
// previously REJECTED applicant may re-apply (we reset the same row to PENDING).
export async function apply(userId, { orgName, bio, website }) {
  const existing = await OrganizerProfile.findOne({ userId });
  if (existing) {
    if (existing.status === 'PENDING') {
      throw conflict('APPLICATION_PENDING', 'You already have an application under review');
    }
    if (existing.status === 'APPROVED') {
      throw conflict('ALREADY_ORGANIZER', 'You are already an approved organizer');
    }
    if (existing.status === 'SUSPENDED') {
      throw conflict('ORGANIZER_SUSPENDED', 'Your organizer account is suspended — contact support');
    }
    // REJECTED → allow a fresh application on the same (unique) userId row.
    existing.orgName = orgName;
    existing.bio = bio;
    existing.website = website;
    existing.status = 'PENDING';
    existing.approvedById = undefined;
    existing.approvedAt = undefined;
    await existing.save();
    return publicOrganizer(existing);
  }

  const slug = await uniqueSlug(OrganizerProfile, orgName);
  const profile = await OrganizerProfile.create({ userId, orgName, slug, bio, website, status: 'PENDING' });
  return publicOrganizer(profile);
}

// The caller's own organizer profile, or null if they have not applied.
export async function getMyProfile(userId) {
  const profile = await OrganizerProfile.findOne({ userId });
  return profile ? publicOrganizer(profile) : null;
}

// Public organizers directory: every APPROVED organizer, sorted by name, with
// a count of their upcoming published events (same window as getPublicProfile).
export async function listPublicOrganizers() {
  const profiles = await OrganizerProfile.find({ status: 'APPROVED' }).select('orgName slug logoUrl bio').sort({ orgName: 1 });
  if (!profiles.length) return [];
  const counts = await Event.aggregate([
    { $match: { organizerId: { $in: profiles.map((p) => p._id) }, status: 'PUBLISHED', endAt: { $gte: new Date() } } },
    { $group: { _id: '$organizerId', count: { $sum: 1 } } },
  ]);
  const upcomingByOrganizer = new Map(counts.map((c) => [String(c._id), c.count]));
  return profiles.map((p) => ({
    name: p.orgName,
    slug: p.slug,
    logoUrl: p.logoUrl || null,
    bio: p.bio || null,
    upcomingCount: upcomingByOrganizer.get(String(p._id)) || 0,
  }));
}

// Public organizer profile (by slug) + their upcoming published events.
export async function getPublicProfile(slug) {
  const profile = await OrganizerProfile.findOne({ slug, status: 'APPROVED' });
  if (!profile) throw notFoundError('ORGANIZER_NOT_FOUND', 'Organizer not found');
  const events = await Event.find({ organizerId: profile._id, status: 'PUBLISHED', endAt: { $gte: new Date() } })
    .populate('categoryId', 'name slug')
    .populate('chapterId', 'name slug flagEmoji')
    .sort({ startAt: 1 })
    .limit(24);
  return {
    organizer: {
      orgName: profile.orgName,
      slug: profile.slug,
      logoUrl: profile.logoUrl || null,
      bio: profile.bio || null,
      website: profile.website || null,
    },
    events: events.map(publicEventCard),
  };
}

// Organizer dashboard KPIs (§7): my events, tickets sold, gross revenue, next event.
export async function getOrganizerDashboard(organizerId) {
  const events = await Event.find({ organizerId }).select('_id status startAt title slug isOnline venueName city');
  const eventIds = events.map((e) => e._id);
  const now = new Date();

  const [ticketsSold, revenueAgg] = await Promise.all([
    Ticket.countDocuments({ eventId: { $in: eventIds }, status: { $in: ['VALID', 'USED'] } }),
    Order.aggregate([
      { $match: { eventId: { $in: eventIds }, status: 'PAID' } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    ]),
  ]);

  const next = events
    .filter((e) => e.status === 'PUBLISHED' && e.startAt && e.startAt >= now)
    .sort((a, b) => a.startAt - b.startAt)[0];

  return {
    events: {
      total: events.length,
      published: events.filter((e) => e.status === 'PUBLISHED').length,
      draft: events.filter((e) => ['DRAFT', 'REJECTED'].includes(e.status)).length,
      pending: events.filter((e) => e.status === 'PENDING_APPROVAL').length,
    },
    ticketsSold,
    grossRevenue: revenueAgg[0]?.revenue || 0, // paise
    paidOrders: revenueAgg[0]?.orders || 0,
    currency: 'INR',
    nextEvent: next
      ? { id: String(next._id), title: next.title, slug: next.slug, startAt: next.startAt, isOnline: !!next.isOnline, venueName: next.venueName || null, city: next.city || null }
      : null,
  };
}
