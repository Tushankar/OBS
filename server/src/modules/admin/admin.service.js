import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { OrganizerProfile, User, Event, Order, Payment, Category, Chapter, ChapterMember, CmsPage, Speaker, Program, EmailLog, AuditLog, Ticket, Session } from '../../models/index.js';

// User-supplied search terms go into $regex — escape metacharacters so a
// search for "(" is a literal match, not a Mongo regex error (500).
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
import { cancelEventCascade, assertSubmittable } from '../events/events.service.js';
import { notifyChapterMembersOfEvent } from '../chapters/chapters.service.js';
import { notifyUser } from '../notifications/notifications.service.js';
import { notFoundError, conflict } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { sendMail } from '../../utils/mailer.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { env } from '../../config/env.js';

// Admin-facing row: organizer profile + the applicant's name/email.
function adminOrganizerRow(p) {
  const u = p.userId && p.userId._id ? p.userId : null;
  return {
    id: String(p._id),
    orgName: p.orgName,
    slug: p.slug,
    bio: p.bio || null,
    website: p.website || null,
    logoUrl: p.logoUrl || null,
    contactName: p.contactName || null,
    phone: p.phone || null,
    orgType: p.orgType || null,
    city: p.city || null,
    socialUrl: p.socialUrl || null,
    experience: p.experience || null,
    registrationNo: p.registrationNo || null,
    status: p.status,
    rejectionReason: p.rejectionReason || null,
    commissionPercent: typeof p.commissionPercent === 'number' ? p.commissionPercent : null,
    appliedAt: p.createdAt,
    approvedAt: p.approvedAt || null,
    user: u ? { id: String(u._id), name: u.name, email: u.email } : null,
  };
}

export async function listOrganizers({ status } = {}) {
  const filter = status ? { status } : {};
  const rows = await OrganizerProfile.find(filter)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
  return rows.map(adminOrganizerRow);
}

async function loadProfileWithUser(id) {
  const profile = await OrganizerProfile.findById(id).populate('userId', 'name email');
  if (!profile) throw notFoundError('ORGANIZER_NOT_FOUND', 'Organizer application not found');
  return profile;
}

const BCRYPT_COST = 12;

// Temporary password: 12 chars, no ambiguous 0/O/1/l/I so it's easy to read
// from the email and retype.
function generatePassword() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// POST /admin/organizers — admin creates an organizer + its login account
// directly. Same fields as the public application, but the account is created
// APPROVED (the admin vouches for it) and a generated password is emailed to
// the organizer's address. Throws EMAIL_TAKEN if the email is already in use.
export async function createOrganizer(adminId, body) {
  const email = body.email.trim().toLowerCase();
  if (await User.findOne({ email })) throw conflict('EMAIL_TAKEN', 'An account with this email already exists');

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({
    name: body.contactName,
    email,
    passwordHash,
    role: 'ORGANIZER',
    status: 'ACTIVE',
    emailVerifiedAt: new Date(), // admin-created & trusted — skip the signup OTP
  });

  const slug = await uniqueSlug(OrganizerProfile, body.orgName);
  const profile = await OrganizerProfile.create({
    userId: user._id,
    orgName: body.orgName,
    slug,
    bio: body.bio,
    website: body.website,
    contactName: body.contactName,
    phone: body.phone,
    orgType: body.orgType,
    city: body.city,
    socialUrl: body.socialUrl,
    experience: body.experience,
    registrationNo: body.registrationNo,
    status: 'APPROVED',
    approvedById: adminId,
    approvedAt: new Date(),
  });

  await writeAudit({
    actorId: adminId,
    action: 'ORGANIZER_CREATED',
    entityType: 'OrganizerProfile',
    entityId: profile._id,
    meta: { orgName: profile.orgName, email },
  });

  const loginUrl = `${env.APP_URL}/organizer`;
  await trySendMail({
    to: email,
    subject: 'Your OBS Events organizer account is ready',
    type: 'ORGANIZER_INVITE',
    userId: user._id,
    text: `Hi ${user.name},\n\nAn organizer account for "${profile.orgName}" has been created for you on OBS Events.\n\nSign in with:\nEmail: ${email}\nTemporary password: ${password}\n\nSign in and open your organizer portal here: ${loginUrl}\n\nFor your security, please change this password after your first sign-in (Account → Security).\n\n— OBS Events`,
    html: `<p>Hi ${user.name},</p><p>An organizer account for <strong>${profile.orgName}</strong> has been created for you on OBS Events.</p><p><strong>Sign in with:</strong><br>Email: ${email}<br>Temporary password: <code>${password}</code></p><p><a href="${loginUrl}">Sign in to your organizer portal</a></p><p>For your security, please change this password after your first sign-in (Account &rarr; Security).</p><p>&mdash; OBS Events</p>`,
  });

  const populated = await OrganizerProfile.findById(profile._id).populate('userId', 'name email');
  return adminOrganizerRow(populated);
}

// Best-effort mail send — never blocks the admin action.
async function trySendMail(args) {
  try {
    await sendMail(args);
  } catch (err) {
    console.error(`[admin] ${args.type} mail send failed:`, err.message);
  }
}

export async function approveOrganizer(adminId, id) {
  const profile = await loadProfileWithUser(id);
  if (profile.status === 'APPROVED') return adminOrganizerRow(profile); // idempotent

  profile.status = 'APPROVED';
  profile.rejectionReason = undefined;
  profile.approvedById = adminId;
  profile.approvedAt = new Date();
  await profile.save();

  // Grant the ORGANIZER role. The conditional filter promotes only USER →
  // ORGANIZER (never demotes an ADMIN) and does not depend on the populated
  // projection above, which omits `role`.
  const user = profile.userId; // populated { _id, name, email }
  const uid = user?._id || profile.userId;
  await User.updateOne({ _id: uid, role: 'USER' }, { role: 'ORGANIZER' });

  await writeAudit({
    actorId: adminId,
    action: 'ORGANIZER_APPROVED',
    entityType: 'OrganizerProfile',
    entityId: profile._id,
    meta: { orgName: profile.orgName },
  });

  await notifyUser({
    userId: uid,
    type: 'ORGANIZER_APPROVED',
    title: "You're approved to host events",
    body: `“${profile.orgName}” can now create and submit events.`,
    link: '/organizer',
    entityType: 'OrganizerProfile',
    entityId: profile._id,
  });

  if (user?.email) {
    await trySendMail({
      to: user.email,
      subject: "You're approved to host events on OBS Events",
      type: 'ORGANIZER_APPROVED',
      userId: user._id,
      text: `Hi ${user.name},\n\nYour organizer application for "${profile.orgName}" has been approved. You can now create and submit events from your organizer portal: ${env.APP_URL}/organizer\n\n— OBS Events`,
      html: `<p>Hi ${user.name},</p><p>Your organizer application for <strong>${profile.orgName}</strong> has been approved. You can now create and submit events from your organizer portal.</p><p><a href="${env.APP_URL}/organizer">Go to your organizer portal</a></p><p>— OBS Events</p>`,
    });
  }

  return adminOrganizerRow(profile);
}

export async function rejectOrganizer(adminId, id, reason) {
  const profile = await loadProfileWithUser(id);
  profile.status = 'REJECTED';
  profile.rejectionReason = reason || undefined;
  profile.approvedById = undefined;
  profile.approvedAt = undefined;
  await profile.save();

  await writeAudit({
    actorId: adminId,
    action: 'ORGANIZER_REJECTED',
    entityType: 'OrganizerProfile',
    entityId: profile._id,
    meta: { orgName: profile.orgName, reason: reason || null },
  });

  const user = profile.userId?._id ? profile.userId : await User.findById(profile.userId);
  if (user?.email) {
    const reasonLine = reason ? `\n\nReason: ${reason}` : '';
    const reasonHtml = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : '';
    await trySendMail({
      to: user.email,
      subject: 'Update on your OBS Events organizer application',
      type: 'ORGANIZER_REJECTED',
      userId: user._id,
      text: `Hi ${user.name},\n\nWe were unable to approve your organizer application for "${profile.orgName}" at this time.${reasonLine}\n\nYou're welcome to update your details and re-apply.\n\n— OBS Events`,
      html: `<p>Hi ${user.name},</p><p>We were unable to approve your organizer application for <strong>${profile.orgName}</strong> at this time.</p>${reasonHtml}<p>You're welcome to update your details and re-apply.</p><p>— OBS Events</p>`,
    });
  }

  return adminOrganizerRow(profile);
}

// ===== Events (task 1.4) =====

function adminEventRow(e) {
  const org = e.organizerId && e.organizerId._id ? e.organizerId : null;
  const cat = e.categoryId && e.categoryId._id ? e.categoryId : null;
  return {
    id: String(e._id),
    title: e.title,
    slug: e.slug,
    status: e.status,
    startAt: e.startAt || null,
    endAt: e.endAt || null,
    city: e.city || null,
    isOnline: !!e.isOnline,
    category: cat ? { id: String(cat._id), name: cat.name } : null,
    organizer: org ? { id: String(org._id), orgName: org.orgName } : null,
    rejectionReason: e.rejectionReason || null,
    isFeatured: !!e.isFeatured,
    ownership: e.ownership || 'OBS',
    publishedAt: e.publishedAt || null,
    createdAt: e.createdAt,
  };
}

// Full event detail for the admin editor (adds the editable content fields the
// list row omits, so the edit modal can prefill — incl. live events).
export async function getEventAdmin(id) {
  const e = await Event.findById(id).populate('organizerId', 'orgName').populate('categoryId', 'name');
  if (!e) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  return {
    ...adminEventRow(e),
    description: e.description || '',
    chapterId: e.chapterId ? String(e.chapterId) : null,
    meetingLink: e.meetingLink || '',
    venueName: e.venueName || '',
    address: e.address || '',
    country: e.country || '',
    bannerUrl: e.bannerUrl || '',
    images: e.images || [],
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    currency: e.currency || 'AED',
    timezone: e.timezone || 'Asia/Dubai',
    // §5.1 community layer — speakers / 100 Days linkage / Launchpad flags.
    speakerIds: (e.speakerIds || []).map(String),
    programId: e.programId ? String(e.programId) : null,
    programDayNumber: e.programDayNumber ?? null,
    isLaunch: !!e.isLaunch,
    launchAt: e.launchAt || null,
    membersOnly: !!e.membersOnly,
  };
}

// The canonical "OBS Events" platform organizer that owns admin-created events.
// Found-or-created (by slug) and attached to a dedicated system user so it never
// clashes with a real admin's own organizer profile.
async function platformOrganizer(adminId) {
  let profile = await OrganizerProfile.findOne({ slug: 'obs-events' });
  if (profile) return profile;
  let sysUser = await User.findOne({ email: 'platform@obs.events' });
  if (!sysUser) sysUser = await User.create({ name: 'OBS Events', email: 'platform@obs.events', role: 'USER', status: 'ACTIVE', emailVerifiedAt: new Date() });
  profile = await OrganizerProfile.findOne({ userId: sysUser._id });
  if (!profile) {
    profile = await OrganizerProfile.create({ userId: sysUser._id, orgName: 'OBS Events', slug: 'obs-events', status: 'APPROVED', approvedById: adminId, approvedAt: new Date(), bio: 'Official events hosted by the OBS platform.' });
  }
  return profile;
}

const ADMIN_EVENT_FIELDS = ['title', 'description', 'categoryId', 'chapterId', 'isOnline', 'meetingLink', 'venueName', 'address', 'city', 'country', 'startAt', 'endAt', 'timezone', 'currency', 'bannerUrl', 'speakerIds', 'programId', 'programDayNumber', 'isLaunch', 'launchAt', 'membersOnly'];

async function assertEventRefs(body) {
  if (body.categoryId && !(await Category.exists({ _id: body.categoryId }))) throw conflict('INVALID_CATEGORY', 'Category not found');
  if (body.chapterId && !(await Chapter.exists({ _id: body.chapterId }))) throw conflict('INVALID_CHAPTER', 'Chapter not found');
  if (body.programId && !(await Program.exists({ _id: body.programId }))) throw conflict('INVALID_PROGRAM', 'Program not found');
  if (body.speakerIds?.length) {
    const found = await Speaker.countDocuments({ _id: { $in: body.speakerIds } });
    if (found !== new Set(body.speakerIds.map(String)).size) throw conflict('INVALID_SPEAKER', 'One or more speakers not found');
  }
}

// POST /admin/events — admin creates an OBS-platform event directly (ownership
// OBS, optionally published + featured). Unlike organizer events, this skips the
// submit→approve loop: the admin publishes it themselves.
export async function createEventAdmin(adminId, body) {
  await assertEventRefs(body);
  const org = await platformOrganizer(adminId);
  const slug = await uniqueSlug(Event, body.title);
  const publish = !!body.publish;
  const doc = { organizerId: org._id, ownership: 'OBS', slug, isFeatured: !!body.isFeatured, status: publish ? 'PUBLISHED' : 'DRAFT' };
  for (const f of ADMIN_EVENT_FIELDS) if (body[f] !== undefined) doc[f] = body[f];
  if (publish) doc.publishedAt = new Date();
  if (doc.startAt && doc.endAt && new Date(doc.endAt) <= new Date(doc.startAt)) throw conflict('INVALID_DATE_RANGE', 'End time must be after the start time');
  const event = await Event.create(doc);
  await event.populate('organizerId', 'orgName');
  await event.populate('categoryId', 'name');
  await writeAudit({ actorId: adminId, action: 'EVENT_CREATED_BY_ADMIN', entityType: 'Event', entityId: event._id, meta: { title: event.title, published: publish } });
  // Member perk: tell the chapter's members their chapter has a new live event.
  if (publish && event.chapterId) notifyChapterMembersOfEvent(event._id).catch((err) => console.error('[admin] member notify failed:', err.message));
  return adminEventRow(event);
}

// PATCH /admin/events/:id — feature toggle (§7) + ownership OBS/PARTNER (§5.6)
// + admin publish/unpublish and content edits (for OBS-platform events).
export async function updateEventAdmin(adminId, id, body) {
  const { isFeatured, ownership, publish } = body;
  const event = await Event.findById(id).populate('organizerId', 'orgName').populate('categoryId', 'name');
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  await assertEventRefs(body);

  if (isFeatured !== undefined) {
    event.isFeatured = !!isFeatured;
    await writeAudit({ actorId: adminId, action: isFeatured ? 'EVENT_FEATURED' : 'EVENT_UNFEATURED', entityType: 'Event', entityId: event._id, meta: { title: event.title } });
  }
  if (ownership !== undefined) {
    event.ownership = ownership;
    await writeAudit({ actorId: adminId, action: 'EVENT_OWNERSHIP_SET', entityType: 'Event', entityId: event._id, meta: { title: event.title, ownership } });
  }
  for (const f of ADMIN_EVENT_FIELDS) if (body[f] !== undefined) event[f] = body[f];
  if (body.title !== undefined && body.title !== event.title) event.slug = await uniqueSlug(Event, body.title, { ignoreId: event._id });
  if (event.startAt && event.endAt && new Date(event.endAt) <= new Date(event.startAt)) throw conflict('INVALID_DATE_RANGE', 'End time must be after the start time');

  // Publishing is only legal from a draft/pending/unpublished state, and only
  // for a COMPLETE event — never resurrect a CANCELLED event (its tickets are
  // voided and its buyers refunded) or push an incomplete draft live. This
  // mirrors the guards on the organizer submit + approve paths.
  const PUBLISHABLE_FROM = ['DRAFT', 'PENDING_APPROVAL'];
  let notifyMembers = false;
  if (publish === true && event.status !== 'PUBLISHED') {
    if (!PUBLISHABLE_FROM.includes(event.status)) {
      throw conflict('EVENT_NOT_PUBLISHABLE', `A ${event.status} event can't be published`);
    }
    await assertSubmittable(event, { requireFuture: false });
    notifyMembers = !event.publishedAt && !!event.chapterId; // republish cycles never re-email members
    event.status = 'PUBLISHED';
    if (!event.publishedAt) event.publishedAt = new Date();
    await writeAudit({ actorId: adminId, action: 'EVENT_PUBLISHED_BY_ADMIN', entityType: 'Event', entityId: event._id, meta: { title: event.title } });
  } else if (publish === false && event.status === 'PUBLISHED') {
    event.status = 'DRAFT';
    await writeAudit({ actorId: adminId, action: 'EVENT_UNPUBLISHED_BY_ADMIN', entityType: 'Event', entityId: event._id, meta: { title: event.title } });
  }

  await event.save();
  // Member perk: tell the chapter's members their chapter has a new live event
  // (after the save so members never get a link to a not-yet-live event).
  if (notifyMembers) notifyChapterMembersOfEvent(event._id).catch((err) => console.error('[admin] member notify failed:', err.message));
  return adminEventRow(event);
}

export async function listEvents({ status, q, page, limit } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };
  const [rows, total] = await Promise.all([
    Event.find(filter)
      .populate('organizerId', 'orgName')
      .populate('categoryId', 'name')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Event.countDocuments(filter),
  ]);
  return { events: rows.map(adminEventRow), total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

// Load an event with the organizer's contact user for approval/rejection emails.
async function loadEventWithOrganizer(id) {
  const event = await Event.findById(id)
    .populate('categoryId', 'name')
    .populate({ path: 'organizerId', populate: { path: 'userId', select: 'name email' } });
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  return event;
}

export async function approveEvent(adminId, id) {
  const event = await loadEventWithOrganizer(id);
  if (event.status !== 'PENDING_APPROVAL') {
    throw conflict('INVALID_EVENT_STATE', `Only a pending event can be approved (this one is ${event.status})`);
  }
  const firstPublish = !event.publishedAt; // re-approvals never re-email members
  event.status = 'PUBLISHED';
  event.publishedAt = new Date();
  event.rejectionReason = undefined;
  await event.save();

  await writeAudit({ actorId: adminId, action: 'EVENT_APPROVED', entityType: 'Event', entityId: event._id, meta: { title: event.title } });

  // Member perk: tell the chapter's members their chapter has a new live event.
  if (firstPublish && event.chapterId) notifyChapterMembersOfEvent(event._id).catch((err) => console.error('[admin] member notify failed:', err.message));

  await notifyUser({
    userId: event.organizerId?.userId?._id,
    type: 'EVENT_APPROVED',
    title: `“${event.title}” is live`,
    body: 'Your event was approved and is now public.',
    link: '/organizer/events',
    entityType: 'Event',
    entityId: event._id,
  });

  const user = event.organizerId?.userId;
  if (user?.email) {
    const url = `${env.APP_URL}/event/${event.slug}`;
    await trySendMail({
      to: user.email,
      subject: `Your event "${event.title}" is live on OBS Events`,
      type: 'EVENT_APPROVED',
      userId: user._id,
      eventId: event._id,
      text: `Hi ${user.name},\n\nGood news — "${event.title}" has been approved and is now live: ${url}\n\n— OBS Events`,
      html: `<p>Hi ${user.name},</p><p>Good news — <strong>${event.title}</strong> has been approved and is now live.</p><p><a href="${url}">View your event</a></p><p>— OBS Events</p>`,
    });
  }
  return adminEventRow(event);
}

// Admin cancels any PUBLISHED event — same cascade as the organizer path
// (void tickets, auto-refund, notify attendees).
export async function adminCancelEvent(adminId, id, reason) {
  const event = await Event.findById(id);
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  const result = await cancelEventCascade(event, { reason, actorId: adminId });
  // Tell the owner their event was cancelled by the platform.
  const orgProfile = await OrganizerProfile.findById(event.organizerId).select('userId').catch(() => null);
  await notifyUser({
    userId: orgProfile?.userId,
    type: 'EVENT_CANCELLED',
    title: `“${event.title}” was cancelled`,
    body: reason || 'Cancelled by the OBS admin team. Attendees are notified and paid orders auto-refund.',
    link: '/organizer/events',
    entityType: 'Event',
    entityId: event._id,
  });
  return result;
}

export async function rejectEvent(adminId, id, reason) {
  const event = await loadEventWithOrganizer(id);
  if (event.status !== 'PENDING_APPROVAL') {
    throw conflict('INVALID_EVENT_STATE', `Only a pending event can be rejected (this one is ${event.status})`);
  }
  event.status = 'REJECTED';
  event.rejectionReason = reason;
  await event.save();

  await writeAudit({ actorId: adminId, action: 'EVENT_REJECTED', entityType: 'Event', entityId: event._id, meta: { title: event.title, reason } });

  await notifyUser({
    userId: event.organizerId?.userId?._id,
    type: 'EVENT_REJECTED',
    title: `Changes needed on “${event.title}”`,
    body: reason || 'Your event was sent back for changes.',
    link: `/organizer/events/${event._id}/edit`,
    entityType: 'Event',
    entityId: event._id,
  });

  const user = event.organizerId?.userId;
  if (user?.email) {
    const url = `${env.APP_URL}/organizer/events/${event._id}/edit`;
    await trySendMail({
      to: user.email,
      subject: `Changes needed on your event "${event.title}"`,
      type: 'EVENT_REJECTED',
      userId: user._id,
      eventId: event._id,
      text: `Hi ${user.name},\n\n"${event.title}" wasn't approved yet.\n\nReason: ${reason}\n\nUpdate it and resubmit: ${url}\n\n— OBS Events`,
      html: `<p>Hi ${user.name},</p><p><strong>${event.title}</strong> wasn't approved yet.</p><p><strong>Reason:</strong> ${reason}</p><p><a href="${url}">Update and resubmit</a></p><p>— OBS Events</p>`,
    });
  }
  return adminEventRow(event);
}

// ===== Dashboard (task 3.5) =====
export async function getAdminDashboard({ days } = {}) {
  // Range-scoped metrics honor ?days=30|90; platform-wide counts never do.
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
  const rangeTicket = { status: { $in: ['VALID', 'USED'] }, ...(since ? { createdAt: { $gte: since } } : {}) };
  const rangeOrder = { status: 'PAID', ...(since ? { createdAt: { $gte: since } } : {}) };

  const [
    users, organizers, publishedEvents, pendingEvents, pendingOrganizers,
    paidOrders, revenueAgg, ticketsSold, checkedIn, buyers, firstEvent,
  ] = await Promise.all([
    User.countDocuments({}),
    OrganizerProfile.countDocuments({ status: 'APPROVED' }),
    Event.countDocuments({ status: 'PUBLISHED' }),
    Event.countDocuments({ status: 'PENDING_APPROVAL' }),
    OrganizerProfile.countDocuments({ status: 'PENDING' }),
    Order.countDocuments(rangeOrder),
    Order.aggregate([{ $match: rangeOrder }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Ticket.countDocuments(rangeTicket),
    Ticket.countDocuments({ ...rangeTicket, checkedInAt: { $ne: null } }),
    Ticket.distinct('userId', rangeTicket),
    Event.findOne({}).sort({ createdAt: 1 }).select('createdAt'),
  ]);

  // Reach — sold tickets grouped by the event's city, with real coordinates
  // (average of that city's event pins) so the dashboard map needs no lookups.
  const cities = await Ticket.aggregate([
    { $match: rangeTicket },
    { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'ev' } },
    { $unwind: '$ev' },
    { $match: { 'ev.city': { $nin: [null, ''] } } },
    { $group: { _id: '$ev.city', tickets: { $sum: 1 }, country: { $first: '$ev.country' }, lat: { $avg: '$ev.lat' }, lng: { $avg: '$ev.lng' } } },
    { $sort: { tickets: -1 } },
    { $limit: 8 },
    { $project: { _id: 0, city: '$_id', tickets: 1, country: 1, lat: 1, lng: 1 } },
  ]);

  // Leaderboard — organizers ranked by tickets sold in range.
  const topOrganizers = await Ticket.aggregate([
    { $match: rangeTicket },
    { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'ev' } },
    { $unwind: '$ev' },
    { $group: { _id: '$ev.organizerId', tickets: { $sum: 1 }, events: { $addToSet: '$ev._id' } } },
    { $sort: { tickets: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'organizerprofiles', localField: '_id', foreignField: '_id', as: 'org' } },
    { $unwind: { path: '$org', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, id: '$_id', name: { $ifNull: ['$org.orgName', 'Unknown'] }, logoUrl: '$org.logoUrl', tickets: 1, events: { $size: '$events' } } },
  ]);

  // Category split — paid vs free tickets per category (same unit both sides).
  const categorySplit = await Ticket.aggregate([
    { $match: rangeTicket },
    { $lookup: { from: 'tickettypes', localField: 'ticketTypeId', foreignField: '_id', as: 'tt' } },
    { $unwind: '$tt' },
    { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'ev' } },
    { $unwind: '$ev' },
    { $lookup: { from: 'categories', localField: 'ev.categoryId', foreignField: '_id', as: 'cat' } },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    { $group: {
      _id: { $ifNull: ['$cat.name', 'Uncategorised'] },
      paid: { $sum: { $cond: [{ $gt: ['$tt.price', 0] }, 1, 0] } },
      free: { $sum: { $cond: [{ $gt: ['$tt.price', 0] }, 0, 1] } },
    } },
    { $sort: { paid: -1, free: -1 } },
    { $limit: 6 },
    { $project: { _id: 0, category: '$_id', paid: 1, free: 1 } },
  ]);

  // Momentum — tickets per category over the last 3 calendar months (radar).
  // UTC month boundaries — $dateToString groups in UTC, so the keys must too.
  const monthStart = (o) => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - o, 1)); };
  const radarRaw = await Ticket.aggregate([
    { $match: { status: { $in: ['VALID', 'USED'] }, createdAt: { $gte: monthStart(2) } } },
    { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'ev' } },
    { $unwind: '$ev' },
    { $lookup: { from: 'categories', localField: 'ev.categoryId', foreignField: '_id', as: 'cat' } },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, category: { $ifNull: ['$cat.name', 'Uncategorised'] } }, tickets: { $sum: 1 } } },
  ]);
  const radarAxes = [...new Set(radarRaw.map((r) => r._id.category))].slice(0, 6);
  const monthKeys = [2, 1, 0].map((o) => monthStart(o).toISOString().slice(0, 7));
  const radar = {
    axes: radarAxes,
    series: monthKeys.map((mk) => ({
      label: new Date(mk + '-02').toLocaleString('en', { month: 'short' }),
      values: radarAxes.map((ax) => radarRaw.find((r) => r._id.month === mk && r._id.category === ax)?.tickets || 0),
    })),
  };

  return {
    users, organizers, publishedEvents, paidOrders,
    grossRevenue: revenueAgg[0]?.total || 0, // paise
    pendingApprovals: pendingEvents + pendingOrganizers,
    currency: 'INR',
    ticketsSold,
    checkedIn,
    checkinRate: ticketsSold ? +((checkedIn / ticketsSold) * 100).toFixed(2) : 0,
    usersReached: buyers.length,
    monthsActive: firstEvent ? Math.max(1, Math.ceil((Date.now() - firstEvent.createdAt) / (30.44 * 24 * 60 * 60 * 1000))) : 0,
    platformSince: firstEvent?.createdAt || null,
    cities,
    topOrganizers,
    categorySplit,
    radar,
    updatedAt: new Date(),
  };
}

// ===== Users (task 3.5) =====
function shapeUser(u) {
  return { id: String(u._id), name: u.name, email: u.email, role: u.role, status: u.status, joined: u.createdAt };
}

export async function listUsers({ search, role, status, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) filter.$or = [{ name: { $regex: escapeRegex(search), $options: 'i' } }, { email: { $regex: escapeRegex(search), $options: 'i' } }];
  const [rows, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  const ids = rows.map((u) => u._id);
  const counts = await Order.aggregate([{ $match: { userId: { $in: ids }, status: 'PAID' } }, { $group: { _id: '$userId', n: { $sum: 1 } } }]);
  const cmap = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    users: rows.map((u) => ({ ...shapeUser(u), orders: cmap.get(String(u._id)) || 0 })),
    total, page, limit, pages: Math.ceil(total / limit) || 1,
  };
}

// PATCH /admin/users/:id — suspend/reactivate + role change. Never lets an admin
// change their own account (avoids self-lockout / self-demotion).
//
// Role changes to/from ORGANIZER also sync the user's OrganizerProfile in the
// same transaction — the profile is the authoritative organizer capability
// (requireApprovedOrganizer gates on profile status, never on role), so the
// role dropdown must actually grant/revoke portal access:
//   → ORGANIZER: upsert the profile to APPROVED (minimal profile if none).
//   ORGANIZER → USER: suspend the existing profile.
export async function updateUser(adminId, id, { status, role }) {
  if (String(adminId) === String(id)) throw conflict('CANNOT_MODIFY_SELF', 'You can’t change your own account here');
  const user = await User.findById(id);
  if (!user) throw notFoundError('USER_NOT_FOUND', 'User not found');

  const statusChanged = status && status !== user.status;
  const roleChanged = role && role !== user.role;
  const prevRole = user.role;

  let profileAudit = null; // { action, profile } — written after commit
  let eventsUnpublished = 0; // live events pulled from the catalog on suspend/demote
  if (statusChanged || roleChanged) {
    const updates = {};
    if (statusChanged) updates.status = status;
    if (roleChanged) updates.role = role;
    // Slug generated before the txn so a retry/abort doesn't re-query mid-txn.
    const newSlug = roleChanged && role === 'ORGANIZER' ? await uniqueSlug(OrganizerProfile, user.name) : null;
    // A suspended user, or an organizer demoted to USER, must lose the ability to
    // keep operating: cut their refresh sessions AND take their live events out
    // of the public catalog.
    const orgDisabled = (statusChanged && status === 'SUSPENDED') || (roleChanged && prevRole === 'ORGANIZER' && role === 'USER');
    // Revoke refresh sessions only on suspension or a genuine privilege DROP —
    // upgrades don't need a forced re-login (requireAuth reads the live role, so
    // any role change already takes effect immediately on the next request).
    const RANK = { VISITOR: 0, USER: 1, ORGANIZER: 2, ADMIN: 3 };
    const demoted = roleChanged && (RANK[role] ?? 1) < (RANK[prevRole] ?? 1);
    const revokeSessions = (statusChanged && status === 'SUSPENDED') || demoted;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        profileAudit = null; // reset on txn retry
        eventsUnpublished = 0;
        await User.updateOne({ _id: user._id }, { $set: updates }, { session });

        // End the refresh chain on suspend/demote so it can't be outlived by a
        // still-valid refresh token (the access token is already cut short by
        // requireAuth's live status/role check).
        if (revokeSessions) {
          await Session.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } }, { session });
        }

        if (roleChanged && role === 'ORGANIZER') {
          let profile = await OrganizerProfile.findOne({ userId: user._id }).session(session);
          if (!profile) {
            [profile] = await OrganizerProfile.create(
              [{ userId: user._id, orgName: user.name, slug: newSlug, status: 'APPROVED', approvedById: adminId, approvedAt: new Date() }],
              { session }
            );
            profileAudit = { action: 'ORGANIZER_APPROVED', profile };
          } else if (profile.status !== 'APPROVED') {
            await OrganizerProfile.updateOne(
              { _id: profile._id },
              { $set: { status: 'APPROVED', approvedById: adminId, approvedAt: new Date() } },
              { session }
            );
            profileAudit = { action: 'ORGANIZER_APPROVED', profile };
          }
        } else if (roleChanged && prevRole === 'ORGANIZER' && role === 'USER') {
          const profile = await OrganizerProfile.findOne({ userId: user._id }).session(session);
          if (profile && profile.status !== 'SUSPENDED') {
            await OrganizerProfile.updateOne({ _id: profile._id }, { $set: { status: 'SUSPENDED' } }, { session });
            profileAudit = { action: 'ORGANIZER_SUSPENDED', profile };
          }
        }

        // Cascade: unpublish the (now-disabled) organizer's live events so no new
        // bookings are taken. Existing tickets stay valid; no refunds are issued
        // (a suspension may be temporary — an admin re-publishes to restore).
        if (orgDisabled) {
          const prof = await OrganizerProfile.findOne({ userId: user._id }).session(session);
          if (prof) {
            const r = await Event.updateMany({ organizerId: prof._id, status: 'PUBLISHED' }, { $set: { status: 'DRAFT' } }, { session });
            eventsUnpublished = r.modifiedCount || 0;
          }
        }
      });
    } finally {
      await session.endSession();
    }
    if (statusChanged) user.status = status;
    if (roleChanged) user.role = role;
  }

  if (statusChanged) {
    await writeAudit({ actorId: adminId, action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', entityType: 'User', entityId: user._id, meta: { email: user.email } });
  }
  if (roleChanged) {
    await writeAudit({ actorId: adminId, action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: user._id, meta: { email: user.email, role } });
  }
  if (profileAudit) {
    await writeAudit({ actorId: adminId, action: profileAudit.action, entityType: 'OrganizerProfile', entityId: profileAudit.profile._id, meta: { orgName: profileAudit.profile.orgName, via: 'USER_ROLE_CHANGE' } });
  }
  if (eventsUnpublished) {
    await writeAudit({ actorId: adminId, action: 'ORGANIZER_EVENTS_UNPUBLISHED', entityType: 'User', entityId: user._id, meta: { email: user.email, count: eventsUnpublished } });
  }
  return shapeUser(user);
}

// ===== Transactions (task 3.5) =====
export async function listTransactions({ gateway, status, search, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (gateway) filter.gateway = gateway;
  if (status) filter.status = status;
  if (search) {
    // Match by order number OR the buyer's name/email — "who booked what" is a
    // person-first question as often as an order-first one.
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    const users = await User.find({ $or: [{ email: rx }, { name: rx }] }).select('_id');
    const orders = await Order.find({ $or: [{ orderNumber: rx }, { userId: { $in: users.map((u) => u._id) } }] }).select('_id');
    filter.orderId = { $in: orders.map((o) => o._id) };
  }
  const [rows, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate({
        path: 'orderId',
        select: 'orderNumber eventId userId currency',
        populate: [{ path: 'eventId', select: 'title' }, { path: 'userId', select: 'name email' }],
      }),
    Payment.countDocuments(filter),
  ]);
  return {
    transactions: rows.map((p) => {
      const o = p.orderId && p.orderId._id ? p.orderId : null;
      return {
        id: String(p._id),
        orderNumber: o?.orderNumber || '—',
        event: o?.eventId?.title || '—',
        buyer: o?.userId?.name || '—',
        buyerEmail: o?.userId?.email || null,
        gateway: p.gateway,
        method: p.method || '—',
        amount: p.amount,
        currency: p.currency || o?.currency || 'INR',
        status: p.status,
        date: p.createdAt,
      };
    }),
    total, page, limit, pages: Math.ceil(total / limit) || 1,
  };
}

// GET /admin/audit — every privileged mutation (approvals, role changes,
// refunds, cancellations, campaign sends), who did it and when.
export async function listAudit({ entityType, search, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (search) filter.action = { $regex: escapeRegex(search), $options: 'i' };
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('actorId', 'name email'),
    AuditLog.countDocuments(filter),
  ]);
  return {
    entries: rows.map((a) => ({
      id: String(a._id),
      action: a.action,
      entityType: a.entityType || null,
      entityId: a.entityId || null,
      actor: a.actorId?.name || '—',
      actorEmail: a.actorId?.email || null,
      meta: a.meta || null,
      at: a.createdAt,
    })),
    total, page, limit, pages: Math.ceil(total / limit) || 1,
  };
}

// GET /admin/users/:id — the CRM drill-down: who this person is, their
// organizer standing, and everything they've booked.
export async function getUserDetail(id) {
  const user = await User.findById(id);
  if (!user) throw notFoundError('USER_NOT_FOUND', 'User not found');
  const allOrders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).populate('eventId', 'title slug');
  const [profile, ticketCount] = await Promise.all([
    OrganizerProfile.findOne({ userId: user._id }).select('orgName slug status'),
    Ticket.countDocuments({ orderId: { $in: allOrders.map((o) => o._id) }, status: { $in: ['VALID', 'USED'] } }),
  ]);
  const spend = allOrders.filter((o) => ['PAID', 'REFUND_REQUESTED'].includes(o.status)).reduce((s, o) => s + (o.totalAmount || 0), 0);
  const orders = allOrders.slice(0, 20);
  return {
    user: shapeUser(user),
    organizer: profile ? { orgName: profile.orgName, slug: profile.slug, status: profile.status } : null,
    stats: { orders: allOrders.length, tickets: ticketCount, spend },
    orders: orders.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      event: o.eventId?.title || '—',
      eventSlug: o.eventId?.slug || null,
      totalAmount: o.totalAmount,
      currency: o.currency || 'INR',
      status: o.status,
      createdAt: o.createdAt,
    })),
  };
}

// GET /admin/emails — the delivery audit (EmailLog) behind every transactional
// mail and campaign send: what went out, to whom, and whether it landed.
export async function listEmails({ type, status, search, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ toEmail: rx }, { subject: rx }];
  }
  const [rows, total] = await Promise.all([
    EmailLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('eventId', 'title'),
    EmailLog.countDocuments(filter),
  ]);
  return {
    emails: rows.map((e) => ({
      id: String(e._id),
      type: e.type,
      to: e.toEmail,
      subject: e.subject || '—',
      status: e.status,
      error: e.error || null,
      event: e.eventId?.title || null,
      sentAt: e.sentAt || e.createdAt,
    })),
    total, page, limit, pages: Math.ceil(total / limit) || 1,
  };
}

// ===== Categories CRUD (task 3.5) =====
function shapeCategory(c) {
  return { id: String(c._id), name: c.name, slug: c.slug, icon: c.icon || null, isActive: c.isActive };
}

export async function adminListCategories() {
  return (await Category.find({}).sort({ name: 1 })).map(shapeCategory);
}

export async function createCategory(adminId, { name, icon }) {
  const slug = await uniqueSlug(Category, name);
  const cat = await Category.create({ name, icon, slug });
  await writeAudit({ actorId: adminId, action: 'CATEGORY_CREATED', entityType: 'Category', entityId: cat._id, meta: { name } });
  return shapeCategory(cat);
}

export async function updateCategory(adminId, id, { name, icon, isActive }) {
  const cat = await Category.findById(id);
  if (!cat) throw notFoundError('CATEGORY_NOT_FOUND', 'Category not found');
  if (name && name !== cat.name) { cat.name = name; cat.slug = await uniqueSlug(Category, name, { ignoreId: cat._id }); }
  if (icon !== undefined) cat.icon = icon;
  if (isActive !== undefined) cat.isActive = isActive;
  await cat.save();
  await writeAudit({ actorId: adminId, action: 'CATEGORY_UPDATED', entityType: 'Category', entityId: cat._id, meta: { name: cat.name } });
  return shapeCategory(cat);
}

export async function deleteCategory(adminId, id) {
  const cat = await Category.findById(id);
  if (!cat) throw notFoundError('CATEGORY_NOT_FOUND', 'Category not found');
  const inUse = await Event.countDocuments({ categoryId: id });
  if (inUse) throw conflict('CATEGORY_IN_USE', `This category is used by ${inUse} event(s) — reassign them first`);
  await cat.deleteOne();
  await writeAudit({ actorId: adminId, action: 'CATEGORY_DELETED', entityType: 'Category', entityId: id, meta: { name: cat.name } });
  return { ok: true };
}

// ===== Chapters CRUD (task 3.5) =====
function shapeChapterAdmin(c) {
  return {
    id: String(c._id), name: c.name, slug: c.slug, type: c.type,
    tier: c.tier || null, pillarGroup: c.pillarGroup || null, ecosystemTier: c.ecosystemTier || null,
    countryCode: c.countryCode || null, flagEmoji: c.flagEmoji || null,
    description: c.description || null, isFlagship: !!c.isFlagship, isActive: c.isActive,
    isOfficial: !!c.isOfficial, status: c.status, sortOrder: c.sortOrder || 0,
  };
}

export async function adminListChapters() {
  const rows = await Chapter.find({}).sort({ sortOrder: 1, name: 1 });
  const [counts, memberCounts] = await Promise.all([
    Event.aggregate([{ $match: { chapterId: { $ne: null } } }, { $group: { _id: '$chapterId', n: { $sum: 1 } } }]),
    ChapterMember.aggregate([{ $group: { _id: '$chapterId', n: { $sum: 1 } } }]),
  ]);
  const cmap = new Map(counts.map((c) => [String(c._id), c.n]));
  const mmap = new Map(memberCounts.map((c) => [String(c._id), c.n]));
  return rows.map((c) => ({ ...shapeChapterAdmin(c), eventCount: cmap.get(String(c._id)) || 0, memberCount: mmap.get(String(c._id)) || 0 }));
}

// GET /admin/chapters/:id/members — the member roster (who joined, when), with
// name/email search. Counts alone were useless for follow-up — this is the list.
export async function listChapterMembers(chapterId, { q, page = 1, limit = 25 } = {}) {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  const filter = { chapterId };
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').limit(500);
    filter.userId = { $in: users.map((u) => u._id) };
  }
  const [rows, total] = await Promise.all([
    ChapterMember.find(filter).populate('userId', 'name email').sort({ joinedAt: -1 }).skip((page - 1) * limit).limit(limit),
    ChapterMember.countDocuments(filter),
  ]);
  const members = rows.filter((m) => m.userId).map((m) => ({
    id: String(m._id),
    userId: String(m.userId._id),
    name: m.userId.name,
    email: m.userId.email,
    joinedAt: m.joinedAt || null,
  }));
  return { chapter: { id: String(chapter._id), name: chapter.name }, members, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

const CHAPTER_FIELDS = ['type', 'tier', 'pillarGroup', 'ecosystemTier', 'countryCode', 'flagEmoji', 'description', 'isFlagship', 'isActive', 'sortOrder'];

export async function createChapter(adminId, body) {
  const slug = await uniqueSlug(Chapter, body.name);
  const doc = { name: body.name, slug };
  for (const f of CHAPTER_FIELDS) if (body[f] !== undefined) doc[f] = body[f];
  const chapter = await Chapter.create(doc);
  await writeAudit({ actorId: adminId, action: 'CHAPTER_CREATED', entityType: 'Chapter', entityId: chapter._id, meta: { name: chapter.name } });
  return shapeChapterAdmin(chapter);
}

export async function updateChapter(adminId, id, body) {
  const chapter = await Chapter.findById(id);
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  if (body.name && body.name !== chapter.name) { chapter.name = body.name; chapter.slug = await uniqueSlug(Chapter, body.name, { ignoreId: chapter._id }); }
  for (const f of CHAPTER_FIELDS) if (body[f] !== undefined) chapter[f] = body[f];
  await chapter.save();
  await writeAudit({ actorId: adminId, action: 'CHAPTER_UPDATED', entityType: 'Chapter', entityId: chapter._id, meta: { name: chapter.name } });
  return shapeChapterAdmin(chapter);
}

export async function deleteChapter(adminId, id) {
  const chapter = await Chapter.findById(id);
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  const inUse = await Event.countDocuments({ chapterId: id });
  if (inUse) throw conflict('CHAPTER_IN_USE', `This chapter is linked to ${inUse} event(s) — reassign them first`);
  await chapter.deleteOne();
  await writeAudit({ actorId: adminId, action: 'CHAPTER_DELETED', entityType: 'Chapter', entityId: id, meta: { name: chapter.name } });
  return { ok: true };
}

// ===== CMS pages CRUD (task 3.5) — public render is the /pages module =====
function shapeCms(p) {
  return { id: String(p._id), slug: p.slug, title: p.title, content: p.content, meta: p.meta || {}, status: p.status, updatedAt: p.updatedAt };
}

export async function adminListCmsPages() {
  return (await CmsPage.find({}).sort({ slug: 1 })).map(shapeCms);
}

export async function createCmsPage(adminId, { slug, title, content, status, meta }) {
  const finalSlug = await uniqueSlug(CmsPage, slug || title);
  const page = await CmsPage.create({ slug: finalSlug, title, content, meta: meta || {}, status: status || 'DRAFT', updatedById: adminId });
  await writeAudit({ actorId: adminId, action: 'CMS_PAGE_CREATED', entityType: 'CmsPage', entityId: page._id, meta: { slug: finalSlug } });
  return shapeCms(page);
}

export async function updateCmsPage(adminId, id, { title, content, status, meta }) {
  const page = await CmsPage.findById(id);
  if (!page) throw notFoundError('PAGE_NOT_FOUND', 'Page not found');
  if (title !== undefined) page.title = title;
  if (content !== undefined) page.content = content;
  if (status !== undefined) page.status = status;
  if (meta !== undefined) { page.meta = meta; page.markModified('meta'); }
  page.updatedById = adminId;
  await page.save();
  await writeAudit({ actorId: adminId, action: 'CMS_PAGE_UPDATED', entityType: 'CmsPage', entityId: page._id, meta: { slug: page.slug } });
  return shapeCms(page);
}

export async function deleteCmsPage(adminId, id) {
  const page = await CmsPage.findById(id);
  if (!page) throw notFoundError('PAGE_NOT_FOUND', 'Page not found');
  await page.deleteOne();
  await writeAudit({ actorId: adminId, action: 'CMS_PAGE_DELETED', entityType: 'CmsPage', entityId: id, meta: { slug: page.slug } });
  return { ok: true };
}
