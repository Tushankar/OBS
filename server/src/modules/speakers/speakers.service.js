import { Speaker, Event } from '../../models/index.js';
import { notFoundError, conflict } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { publicEventCard } from '../events/events.service.js';

export function shapeSpeaker(s) {
  return {
    id: String(s._id),
    name: s.name,
    slug: s.slug,
    photoUrl: s.photoUrl || null,
    title: s.title || null,
    company: s.company || null,
    bio: s.bio || null,
    topics: s.topics || [],
    linkedin: s.linkedin || null,
    twitter: s.twitter || null,
    website: s.website || null,
    isFeatured: !!s.isFeatured,
    sortOrder: s.sortOrder || 0,
  };
}

// GET /speakers ?q &topic &featured → { speakers, topics }.
// `topics` is the distinct set across ALL speakers (ignoring the current
// filters) so the directory chips always reflect the real vocabulary.
export async function listSpeakers({ q, topic, featured } = {}) {
  const filter = { organizerId: null }; // public directory = platform speakers only
  if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { company: { $regex: q, $options: 'i' } }];
  if (topic) filter.topics = topic;
  if (featured === 'true' || featured === true) filter.isFeatured = true;
  const [rows, allTopics] = await Promise.all([
    Speaker.find(filter).sort({ sortOrder: 1, name: 1 }),
    Speaker.distinct('topics', { organizerId: null }),
  ]);
  const topics = allTopics.filter(Boolean).sort((a, b) => a.localeCompare(b));
  return { speakers: rows.map(shapeSpeaker), topics };
}

// GET /speakers/:slug → profile + upcoming (PUBLISHED, still running or
// ahead) and past (PUBLISHED/COMPLETED, already ended, newest first) events.
export async function getSpeakerBySlug(slug) {
  const speaker = await Speaker.findOne({ slug });
  if (!speaker) throw notFoundError('SPEAKER_NOT_FOUND', 'Speaker not found');
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    Event.find({ speakerIds: speaker._id, status: 'PUBLISHED', endAt: { $gte: now } })
      .populate('categoryId', 'name slug')
      .populate('chapterId', 'name slug flagEmoji countryCode')
      .sort({ startAt: 1 })
      .limit(24),
    Event.find({ speakerIds: speaker._id, status: { $in: ['PUBLISHED', 'COMPLETED'] }, endAt: { $lt: now } })
      .populate('categoryId', 'name slug')
      .populate('chapterId', 'name slug flagEmoji countryCode')
      .sort({ startAt: -1 })
      .limit(24),
  ]);
  return { speaker: shapeSpeaker(speaker), upcoming: upcoming.map(publicEventCard), past: past.map(publicEventCard) };
}

// ---- Admin CRUD ----
export async function adminListSpeakers() {
  // Platform directory only — organizer-owned speakers live in their portals.
  return (await Speaker.find({ organizerId: null }).sort({ sortOrder: 1, name: 1 })).map(shapeSpeaker);
}

export async function createSpeaker(adminId, body) {
  const slug = await uniqueSlug(Speaker, body.name);
  const speaker = await Speaker.create({ ...body, slug });
  await writeAudit({ actorId: adminId, action: 'SPEAKER_CREATED', entityType: 'Speaker', entityId: speaker._id, meta: { name: speaker.name } });
  return shapeSpeaker(speaker);
}

export async function updateSpeaker(adminId, id, body) {
  const speaker = await Speaker.findById(id);
  if (!speaker) throw notFoundError('SPEAKER_NOT_FOUND', 'Speaker not found');
  if (body.name && body.name !== speaker.name) { speaker.name = body.name; speaker.slug = await uniqueSlug(Speaker, body.name, { ignoreId: speaker._id }); }
  for (const f of ['photoUrl', 'title', 'company', 'bio', 'topics', 'linkedin', 'twitter', 'website', 'isFeatured', 'sortOrder']) {
    if (body[f] !== undefined) speaker[f] = body[f];
  }
  await speaker.save();
  await writeAudit({ actorId: adminId, action: 'SPEAKER_UPDATED', entityType: 'Speaker', entityId: speaker._id, meta: { name: speaker.name } });
  return shapeSpeaker(speaker);
}

export async function deleteSpeaker(adminId, id) {
  const speaker = await Speaker.findById(id);
  if (!speaker) throw notFoundError('SPEAKER_NOT_FOUND', 'Speaker not found');
  const inUse = await Event.countDocuments({ speakerIds: id });
  if (inUse) throw conflict('SPEAKER_IN_USE', `This speaker is attached to ${inUse} event(s) — detach them first`);
  await speaker.deleteOne();
  await writeAudit({ actorId: adminId, action: 'SPEAKER_DELETED', entityType: 'Speaker', entityId: id, meta: { name: speaker.name } });
  return { ok: true };
}

// ---- Organizer speaker library — an organizer's own speakers, fully ----
// ---- separate from the platform directory. ----
export async function listOrganizerSpeakers(organizerId) {
  return (await Speaker.find({ organizerId }).sort({ name: 1 })).map(shapeSpeaker);
}

async function loadOwnSpeaker(organizerId, id) {
  const speaker = await Speaker.findOne({ _id: id, organizerId });
  if (!speaker) throw notFoundError('SPEAKER_NOT_FOUND', 'Speaker not found');
  return speaker;
}

export async function createOrganizerSpeaker(organizerId, body) {
  const slug = await uniqueSlug(Speaker, body.name);
  const speaker = await Speaker.create({ ...body, slug, organizerId, isFeatured: false, sortOrder: 0 });
  return shapeSpeaker(speaker);
}

export async function updateOrganizerSpeaker(organizerId, id, body) {
  const speaker = await loadOwnSpeaker(organizerId, id);
  if (body.name && body.name !== speaker.name) {
    speaker.name = body.name;
    speaker.slug = await uniqueSlug(Speaker, body.name, { ignoreId: speaker._id });
  }
  for (const f of ['photoUrl', 'title', 'company', 'bio', 'topics', 'linkedin', 'twitter', 'website']) {
    if (body[f] !== undefined) speaker[f] = body[f];
  }
  await speaker.save();
  return shapeSpeaker(speaker);
}

export async function deleteOrganizerSpeaker(organizerId, id) {
  const speaker = await loadOwnSpeaker(organizerId, id);
  const inUse = await Event.countDocuments({ speakerIds: id });
  if (inUse) throw conflict('SPEAKER_IN_USE', `This speaker is attached to ${inUse} event(s) — detach them first`);
  await speaker.deleteOne();
  return { ok: true };
}

// Used by the event detail payload (Speakers block).
export async function speakersForEvent(speakerIds = []) {
  if (!speakerIds.length) return [];
  const rows = await Speaker.find({ _id: { $in: speakerIds } }).sort({ sortOrder: 1, name: 1 });
  return rows.map(shapeSpeaker);
}
