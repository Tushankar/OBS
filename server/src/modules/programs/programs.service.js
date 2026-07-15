import { Program, ProgramDay, Event, Sponsor, Speaker } from '../../models/index.js';
import { notFoundError, conflict } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { publicEventCard } from '../events/events.service.js';
import { shapeSponsor } from '../sponsors/sponsors.service.js';
import { shapeSpeaker } from '../speakers/speakers.service.js';

const DAY_MS = 24 * 3600 * 1000;
export const PROGRAM_LENGTH = 100;
const PROGRAM_SPEAKERS_LIMIT = 12;
const addDays = (date, n) => new Date(new Date(date).getTime() + n * DAY_MS);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Live season status (independent of the stored status field), §5.5:
// before start → { phase: UPCOMING, daysUntil }; during → { phase: ACTIVE,
// dayOfSeason 1..100 }; after → { phase: ENDED }.
export function seasonStatus(program, now = new Date()) {
  const start = new Date(program.startAt).getTime();
  const end = new Date(program.endAt).getTime();
  const t = now.getTime();
  if (t < start) return { phase: 'UPCOMING', daysUntil: Math.ceil((start - t) / DAY_MS), totalDays: PROGRAM_LENGTH };
  if (t > end + DAY_MS) return { phase: 'ENDED', totalDays: PROGRAM_LENGTH };
  const dayOfSeason = Math.min(PROGRAM_LENGTH, Math.floor((t - start) / DAY_MS) + 1);
  return { phase: 'ACTIVE', dayOfSeason, totalDays: PROGRAM_LENGTH };
}

function shapeProgram(p, now) {
  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    year: p.year,
    startAt: p.startAt,
    endAt: p.endAt,
    theme: p.theme || null,
    description: p.description || null,
    coverUrl: p.coverUrl || null,
    status: p.status,
    season: seasonStatus(p, now),
  };
}
function shapeDay(d) {
  return { id: String(d._id), dayNumber: d.dayNumber, date: d.date, title: d.title || null, theme: d.theme || null };
}

// Generate the 100 ProgramDay rows for an edition (idempotent — skips existing).
export async function ensureProgramDays(program) {
  const existing = await ProgramDay.countDocuments({ programId: program._id });
  if (existing >= PROGRAM_LENGTH) return existing;
  const ops = [];
  for (let n = 1; n <= PROGRAM_LENGTH; n++) {
    ops.push({
      updateOne: {
        filter: { programId: program._id, dayNumber: n },
        update: { $setOnInsert: { programId: program._id, dayNumber: n, date: addDays(program.startAt, n - 1) } },
        upsert: true,
      },
    });
  }
  await ProgramDay.bulkWrite(ops);
  return PROGRAM_LENGTH;
}

// GET /programs/current — the ACTIVE edition, else the next UPCOMING, else the
// most recent. Null if none exist.
export async function getCurrentProgram(now = new Date()) {
  let program = await Program.findOne({ startAt: { $lte: now }, endAt: { $gte: now } }).sort({ startAt: -1 });
  if (!program) program = await Program.findOne({ startAt: { $gt: now } }).sort({ startAt: 1 });
  if (!program) program = await Program.findOne({}).sort({ startAt: -1 });
  if (!program) return { program: null };
  return { program: shapeProgram(program, now) };
}

// GET /programs/:slug — edition + its 100 days, each with its PUBLISHED events
// (grouped by programDayNumber in one query so the overview needs no per-day
// round-trips), plus the season's PROGRAM-scoped sponsors and a rail of
// distinct speakers aggregated from the season's events.
export async function getProgramBySlug(slug, now = new Date()) {
  const program = await Program.findOne({ slug });
  if (!program) throw notFoundError('PROGRAM_NOT_FOUND', 'Program not found');
  const [days, events, sponsors] = await Promise.all([
    ProgramDay.find({ programId: program._id }).sort({ dayNumber: 1 }),
    Event.find({ programId: program._id, status: 'PUBLISHED' })
      .populate('categoryId', 'name slug')
      .populate('chapterId', 'name slug flagEmoji')
      .sort({ startAt: 1 }),
    Sponsor.find({ scope: 'PROGRAM', programId: program._id, isActive: true, status: 'APPROVED' }).sort({ sortOrder: 1, name: 1 }),
  ]);
  const byDay = new Map();
  const speakerIds = new Set();
  for (const e of events) {
    for (const id of e.speakerIds || []) speakerIds.add(String(id));
    if (!e.programDayNumber) continue;
    if (!byDay.has(e.programDayNumber)) byDay.set(e.programDayNumber, []);
    byDay.get(e.programDayNumber).push(publicEventCard(e));
  }
  const speakers = speakerIds.size
    ? await Speaker.find({ _id: { $in: [...speakerIds] } })
        .sort({ isFeatured: -1, sortOrder: 1, name: 1 })
        .limit(PROGRAM_SPEAKERS_LIMIT)
    : [];
  return {
    program: shapeProgram(program, now),
    days: days.map((d) => ({ ...shapeDay(d), events: byDay.get(d.dayNumber) || [] })),
    sponsors: sponsors.map(shapeSponsor),
    speakers: speakers.map(shapeSpeaker),
  };
}

// GET /programs/:slug/days/:n — day n + that day's PUBLISHED events (?country,
// matched exact but case-insensitively against the stored geocoder long name).
export async function getProgramDay(slug, n, { country } = {}, now = new Date()) {
  const program = await Program.findOne({ slug });
  if (!program) throw notFoundError('PROGRAM_NOT_FOUND', 'Program not found');
  if (n < 1 || n > PROGRAM_LENGTH) throw conflict('INVALID_DAY', `Day must be between 1 and ${PROGRAM_LENGTH}`);
  const day = await ProgramDay.findOne({ programId: program._id, dayNumber: n });
  const filter = { programId: program._id, programDayNumber: n, status: 'PUBLISHED' };
  if (country) filter.country = { $regex: `^${escapeRegex(country)}$`, $options: 'i' };
  const events = await Event.find(filter)
    .populate('categoryId', 'name slug')
    .populate('chapterId', 'name slug flagEmoji')
    .sort({ startAt: 1 });
  return {
    program: shapeProgram(program, now),
    day: day ? shapeDay(day) : { dayNumber: n, date: addDays(program.startAt, n - 1), title: null, theme: null },
    events: events.map(publicEventCard),
  };
}

// ---- Admin CRUD ----
export async function adminListPrograms() {
  const rows = await Program.find({}).sort({ year: -1 });
  return rows.map((p) => shapeProgram(p));
}
export async function createProgram(adminId, body) {
  const slug = await uniqueSlug(Program, body.slug || body.name);
  const startAt = new Date(body.startAt);
  const endAt = body.endAt ? new Date(body.endAt) : addDays(startAt, PROGRAM_LENGTH - 1);
  const program = await Program.create({ ...body, slug, startAt, endAt });
  await ensureProgramDays(program);
  await writeAudit({ actorId: adminId, action: 'PROGRAM_CREATED', entityType: 'Program', entityId: program._id, meta: { name: program.name } });
  return shapeProgram(program);
}
export async function updateProgram(adminId, id, body) {
  const program = await Program.findById(id);
  if (!program) throw notFoundError('PROGRAM_NOT_FOUND', 'Program not found');
  if (body.name && body.name !== program.name) { program.name = body.name; program.slug = await uniqueSlug(Program, body.name, { ignoreId: program._id }); }
  for (const f of ['year', 'startAt', 'endAt', 'theme', 'description', 'coverUrl', 'status']) {
    if (body[f] !== undefined) program[f] = body[f];
  }
  await program.save();
  await writeAudit({ actorId: adminId, action: 'PROGRAM_UPDATED', entityType: 'Program', entityId: program._id, meta: { name: program.name } });
  return shapeProgram(program);
}
export async function deleteProgram(adminId, id) {
  const program = await Program.findById(id);
  if (!program) throw notFoundError('PROGRAM_NOT_FOUND', 'Program not found');
  await ProgramDay.deleteMany({ programId: id });
  await program.deleteOne();
  await writeAudit({ actorId: adminId, action: 'PROGRAM_DELETED', entityType: 'Program', entityId: id, meta: { name: program.name } });
  return { ok: true };
}

// Admin day management (title/theme per day).
export async function adminListDays(programId) {
  const days = await ProgramDay.find({ programId }).sort({ dayNumber: 1 });
  return days.map(shapeDay);
}
export async function updateProgramDay(adminId, programId, dayNumber, body) {
  const day = await ProgramDay.findOne({ programId, dayNumber });
  if (!day) throw notFoundError('PROGRAM_DAY_NOT_FOUND', 'Program day not found');
  if (body.title !== undefined) day.title = body.title;
  if (body.theme !== undefined) day.theme = body.theme;
  await day.save();
  await writeAudit({ actorId: adminId, action: 'PROGRAM_DAY_UPDATED', entityType: 'ProgramDay', entityId: day._id, meta: { programId: String(programId), dayNumber } });
  return shapeDay(day);
}

// Seed helper — the current-year edition (15 Oct → 22 Jan). Idempotent by slug.
export async function seedCurrentProgram(now = new Date()) {
  // The season "year" is the year whose 15 Oct is the most recent one that has
  // passed (or is upcoming this calendar year).
  const y = now.getUTCFullYear();
  const start = new Date(Date.UTC(y, 9, 15)); // 15 Oct (month index 9)
  const end = addDays(start, PROGRAM_LENGTH - 1); // Day 100 = 22 Jan (y+1)
  const slug = `obs-100-days-${y}`;
  let program = await Program.findOne({ slug });
  if (!program) {
    program = await Program.create({ name: `OBS 100 Days ${y}`, slug, year: y, startAt: start, endAt: end, theme: 'One Business Season', description: '100 days of business events across the OBS network.', status: 'UPCOMING' });
  }
  await ensureProgramDays(program);
  return program;
}
