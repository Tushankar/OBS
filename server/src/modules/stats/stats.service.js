import { Chapter, Event, Program } from '../../models/index.js';
import { seasonStatus } from '../programs/programs.service.js';

// Platform-wide public counters for the home surfaces (§5.7). Real aggregates
// only — the client hides/softens any metric that is zero or fails to load,
// so this never needs to pad numbers.
export async function getPlatformStats(now = new Date()) {
  const chapterFilter = { status: 'APPROVED', isActive: true };
  const [chapters, chapterCountries, upcomingEvents, totalEvents, liveProgram] = await Promise.all([
    Chapter.countDocuments(chapterFilter),
    Chapter.distinct('countryCode', { ...chapterFilter, countryCode: { $nin: [null, ''] } }),
    Event.countDocuments({ status: 'PUBLISHED', endAt: { $gte: now } }),
    Event.countDocuments({ status: { $in: ['PUBLISHED', 'COMPLETED'] } }),
    Program.findOne({ startAt: { $lte: now }, endAt: { $gte: now } }).sort({ startAt: -1 }),
  ]);

  // Community-created chapters may lack a country code — fall back to the
  // countries of real events so the metric stays meaningful.
  let countries = chapterCountries.length;
  if (!countries) {
    const eventCountries = await Event.distinct('country', {
      status: { $in: ['PUBLISHED', 'COMPLETED'] },
      country: { $nin: [null, ''] },
    });
    countries = eventCountries.length;
  }

  const season = liveProgram ? seasonStatus(liveProgram, now) : null;
  const programDay = season?.phase === 'ACTIVE' ? season.dayOfSeason : null;

  return { chapters, countries, upcomingEvents, totalEvents, programDay };
}
