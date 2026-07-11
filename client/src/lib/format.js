// Shared date/time formatting. One locale (en-IN) everywhere, and event times
// always carry the event's own timezone label (e.g. "IST") so a visitor in
// another country can tell which zone a bare time belongs to.

const LOCALE = 'en-IN';

// Short timezone label ("IST", "GST", "EST") for a given IANA zone at a moment.
export function tzLabel(iso, timeZone) {
  if (!timeZone) return '';
  try {
    const parts = new Intl.DateTimeFormat(LOCALE, { timeZone, timeZoneName: 'short' }).formatToParts(new Date(iso));
    return parts.find((p) => p.type === 'timeZoneName')?.value || '';
  } catch {
    return '';
  }
}

export function fmtDate(iso, { timeZone } = {}) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(LOCALE, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  });
}

export function fmtTime(iso, { timeZone } = {}) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: 'numeric', minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

export function fmtDateTime(iso, { timeZone } = {}) {
  if (!iso) return '';
  const label = tzLabel(iso, timeZone);
  return `${fmtDate(iso, { timeZone })}, ${fmtTime(iso, { timeZone })}${label ? ` ${label}` : ''}`;
}

// "Sat, 14 Mar 2026, 6:00 pm – 9:00 pm IST" (same-day) or a full two-date
// range when the event spans days.
export function fmtRange(startIso, endIso, timeZone) {
  if (!startIso) return '';
  const label = tzLabel(startIso, timeZone);
  const suffix = label ? ` ${label}` : '';
  if (!endIso) return `${fmtDate(startIso, { timeZone })}, ${fmtTime(startIso, { timeZone })}${suffix}`;
  const sameDay = fmtDate(startIso, { timeZone }) === fmtDate(endIso, { timeZone });
  if (sameDay) {
    return `${fmtDate(startIso, { timeZone })}, ${fmtTime(startIso, { timeZone })} – ${fmtTime(endIso, { timeZone })}${suffix}`;
  }
  return `${fmtDateTime(startIso, { timeZone })} – ${fmtDateTime(endIso, { timeZone })}`;
}
