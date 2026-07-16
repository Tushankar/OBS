// Day arithmetic for multi-day events. All "day numbers" are 1-based and
// relative to the event's startAt, computed on calendar-day boundaries in the
// event's own timezone (a 7pm Day-1 start and a 9am Day-2 session are
// different days even though <24h apart).

const DAY_MS = 24 * 60 * 60 * 1000;

// Calendar date of `d` in `tz`, as a UTC-midnight timestamp (stable day key).
function dayKey(d, tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, day] = fmt.format(new Date(d)).split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

// Total calendar days the event spans (≥1). Events missing dates count as 1.
export function eventTotalDays(event) {
  if (!event?.startAt || !event?.endAt) return 1;
  const span = Math.round((dayKey(event.endAt, event.timezone) - dayKey(event.startAt, event.timezone)) / DAY_MS) + 1;
  return Math.max(1, span);
}

// 1-based day number of `date` within the event, clamped to [1, totalDays] so
// early door-opens and late-running last days still scan sensibly.
export function eventDayNumber(event, date = new Date()) {
  const total = eventTotalDays(event);
  if (!event?.startAt) return 1;
  const n = Math.round((dayKey(date, event.timezone) - dayKey(event.startAt, event.timezone)) / DAY_MS) + 1;
  return Math.min(total, Math.max(1, n));
}

// The concrete calendar date (UTC midnight) of a given event day — for labels.
export function eventDayDate(event, dayNumber) {
  if (!event?.startAt) return null;
  return new Date(dayKey(event.startAt, event.timezone) + (dayNumber - 1) * DAY_MS);
}
