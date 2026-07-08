import { OrganizerProfile, User, Event, Order, Payment, Category, Chapter, CmsPage } from '../../models/index.js';
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
    status: p.status,
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
    publishedAt: e.publishedAt || null,
    createdAt: e.createdAt,
  };
}

// PATCH /admin/events/:id — feature toggle (§7). Home rails surface featured events.
export async function setEventFeatured(adminId, id, isFeatured) {
  const event = await Event.findById(id).populate('organizerId', 'orgName').populate('categoryId', 'name');
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  event.isFeatured = !!isFeatured;
  await event.save();
  await writeAudit({ actorId: adminId, action: isFeatured ? 'EVENT_FEATURED' : 'EVENT_UNFEATURED', entityType: 'Event', entityId: event._id, meta: { title: event.title } });
  return adminEventRow(event);
}

export async function listEvents({ status, q, page, limit } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.title = { $regex: q, $options: 'i' };
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
  event.status = 'PUBLISHED';
  event.publishedAt = new Date();
  event.rejectionReason = undefined;
  await event.save();

  await writeAudit({ actorId: adminId, action: 'EVENT_APPROVED', entityType: 'Event', entityId: event._id, meta: { title: event.title } });

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

export async function rejectEvent(adminId, id, reason) {
  const event = await loadEventWithOrganizer(id);
  if (event.status !== 'PENDING_APPROVAL') {
    throw conflict('INVALID_EVENT_STATE', `Only a pending event can be rejected (this one is ${event.status})`);
  }
  event.status = 'REJECTED';
  event.rejectionReason = reason;
  await event.save();

  await writeAudit({ actorId: adminId, action: 'EVENT_REJECTED', entityType: 'Event', entityId: event._id, meta: { title: event.title, reason } });

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
export async function getAdminDashboard() {
  const [users, organizers, publishedEvents, pendingEvents, pendingOrganizers, paidOrders, revenueAgg] = await Promise.all([
    User.countDocuments({}),
    OrganizerProfile.countDocuments({ status: 'APPROVED' }),
    Event.countDocuments({ status: 'PUBLISHED' }),
    Event.countDocuments({ status: 'PENDING_APPROVAL' }),
    OrganizerProfile.countDocuments({ status: 'PENDING' }),
    Order.countDocuments({ status: 'PAID' }),
    Order.aggregate([{ $match: { status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
  ]);
  return {
    users, organizers, publishedEvents, paidOrders,
    grossRevenue: revenueAgg[0]?.total || 0, // paise
    pendingApprovals: pendingEvents + pendingOrganizers,
    currency: 'INR',
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
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
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
export async function updateUser(adminId, id, { status, role }) {
  if (String(adminId) === String(id)) throw conflict('CANNOT_MODIFY_SELF', 'You can’t change your own account here');
  const user = await User.findById(id);
  if (!user) throw notFoundError('USER_NOT_FOUND', 'User not found');

  const statusChanged = status && status !== user.status;
  const roleChanged = role && role !== user.role;
  if (statusChanged) user.status = status;
  if (roleChanged) user.role = role;
  if (statusChanged || roleChanged) await user.save();

  if (statusChanged) {
    await writeAudit({ actorId: adminId, action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', entityType: 'User', entityId: user._id, meta: { email: user.email } });
  }
  if (roleChanged) {
    await writeAudit({ actorId: adminId, action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: user._id, meta: { email: user.email, role } });
  }
  return shapeUser(user);
}

// ===== Transactions (task 3.5) =====
export async function listTransactions({ gateway, status, search, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (gateway) filter.gateway = gateway;
  if (status) filter.status = status;
  if (search) {
    const orders = await Order.find({ orderNumber: { $regex: search, $options: 'i' } }).select('_id');
    filter.orderId = { $in: orders.map((o) => o._id) };
  }
  const [rows, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate({ path: 'orderId', select: 'orderNumber eventId currency', populate: { path: 'eventId', select: 'title' } }),
    Payment.countDocuments(filter),
  ]);
  return {
    transactions: rows.map((p) => {
      const o = p.orderId && p.orderId._id ? p.orderId : null;
      return {
        id: String(p._id),
        orderNumber: o?.orderNumber || '—',
        event: o?.eventId?.title || '—',
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
  const counts = await Event.aggregate([{ $match: { chapterId: { $ne: null } } }, { $group: { _id: '$chapterId', n: { $sum: 1 } } }]);
  const cmap = new Map(counts.map((c) => [String(c._id), c.n]));
  return rows.map((c) => ({ ...shapeChapterAdmin(c), eventCount: cmap.get(String(c._id)) || 0 }));
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
  return { id: String(p._id), slug: p.slug, title: p.title, content: p.content, status: p.status, updatedAt: p.updatedAt };
}

export async function adminListCmsPages() {
  return (await CmsPage.find({}).sort({ slug: 1 })).map(shapeCms);
}

export async function createCmsPage(adminId, { slug, title, content, status }) {
  const finalSlug = await uniqueSlug(CmsPage, slug || title);
  const page = await CmsPage.create({ slug: finalSlug, title, content, status: status || 'DRAFT', updatedById: adminId });
  await writeAudit({ actorId: adminId, action: 'CMS_PAGE_CREATED', entityType: 'CmsPage', entityId: page._id, meta: { slug: finalSlug } });
  return shapeCms(page);
}

export async function updateCmsPage(adminId, id, { title, content, status }) {
  const page = await CmsPage.findById(id);
  if (!page) throw notFoundError('PAGE_NOT_FOUND', 'Page not found');
  if (title !== undefined) page.title = title;
  if (content !== undefined) page.content = content;
  if (status !== undefined) page.status = status;
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
