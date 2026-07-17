// Event timezone handling. The rule: the wall-clock time an organizer types
// is in the EVENT's timezone (the venue's), never the creator's browser zone —
// a Dubai organizer typing 19:00 for a London event means 7 PM London.
// Conversions use Intl (built-in IANA data, DST-correct); no dependencies.

// Zone offset (ms) at a given instant — positive when ahead of UTC.
function tzOffset(ts, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(dtf.formatToParts(ts).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour === '24' ? 0 : +p.hour, +p.minute, +p.second);
  return asUTC - ts;
}

// 'YYYY-MM-DDTHH:mm' (wall clock in `timeZone`) → UTC ISO string.
export function zonedInputToISO(local, timeZone) {
  if (!local) return undefined;
  const [d, t] = local.split('T');
  if (!d || !t) return undefined;
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  const naiveUTC = Date.UTC(y, m - 1, day, hh, mm);
  let ts = naiveUTC - tzOffset(naiveUTC, timeZone);
  const o2 = tzOffset(ts, timeZone); // re-check across a DST boundary
  if (naiveUTC - o2 !== ts) ts = naiveUTC - o2;
  return new Date(ts).toISOString();
}

// UTC ISO → 'YYYY-MM-DDTHH:mm' wall clock in `timeZone` (datetime-local value).
export function isoToZonedInput(iso, timeZone) {
  if (!iso) return '';
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

// Current UTC offset label for a zone, e.g. "UTC+4" / "UTC+5:30".
export function tzOffsetLabel(timeZone) {
  try {
    const mins = tzOffset(Date.now(), timeZone) / 60000;
    const sign = mins >= 0 ? '+' : '-';
    const abs = Math.abs(mins);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
  } catch { return ''; }
}

// Curated zone list covering the OBS network (value = IANA id).
export const TIMEZONES = [
  ['Asia/Dubai', 'Dubai / Abu Dhabi'],
  ['Asia/Riyadh', 'Riyadh'],
  ['Asia/Qatar', 'Doha'],
  ['Asia/Kolkata', 'India'],
  ['Asia/Karachi', 'Karachi'],
  ['Asia/Dhaka', 'Dhaka'],
  ['Asia/Colombo', 'Colombo'],
  ['Asia/Singapore', 'Singapore'],
  ['Asia/Kuala_Lumpur', 'Kuala Lumpur'],
  ['Asia/Bangkok', 'Bangkok'],
  ['Asia/Jakarta', 'Jakarta'],
  ['Asia/Manila', 'Manila'],
  ['Asia/Ho_Chi_Minh', 'Ho Chi Minh City'],
  ['Asia/Hong_Kong', 'Hong Kong'],
  ['Asia/Shanghai', 'China'],
  ['Asia/Taipei', 'Taipei'],
  ['Asia/Seoul', 'Seoul'],
  ['Asia/Tokyo', 'Tokyo'],
  ['Australia/Sydney', 'Sydney'],
  ['Pacific/Auckland', 'Auckland'],
  ['Europe/London', 'London'],
  ['Europe/Dublin', 'Dublin'],
  ['Europe/Paris', 'Paris / Berlin / Rome'],
  ['Europe/Amsterdam', 'Amsterdam / Brussels'],
  ['Europe/Madrid', 'Madrid'],
  ['Europe/Lisbon', 'Lisbon'],
  ['Europe/Zurich', 'Zurich'],
  ['Europe/Vienna', 'Vienna'],
  ['Europe/Stockholm', 'Stockholm'],
  ['Europe/Oslo', 'Oslo'],
  ['Europe/Copenhagen', 'Copenhagen'],
  ['Europe/Helsinki', 'Helsinki'],
  ['Europe/Warsaw', 'Warsaw'],
  ['Europe/Bucharest', 'Bucharest'],
  ['Europe/Athens', 'Athens'],
  ['Europe/Istanbul', 'Istanbul'],
  ['Europe/Moscow', 'Moscow'],
  ['Africa/Cairo', 'Cairo'],
  ['Africa/Casablanca', 'Casablanca'],
  ['Africa/Lagos', 'Lagos'],
  ['Africa/Accra', 'Accra'],
  ['Africa/Nairobi', 'Nairobi'],
  ['Africa/Dar_es_Salaam', 'Dar es Salaam'],
  ['Africa/Kigali', 'Kigali'],
  ['Africa/Johannesburg', 'Johannesburg'],
  ['America/New_York', 'New York (Eastern)'],
  ['America/Chicago', 'Chicago (Central)'],
  ['America/Denver', 'Denver (Mountain)'],
  ['America/Los_Angeles', 'Los Angeles (Pacific)'],
  ['America/Toronto', 'Toronto'],
  ['America/Vancouver', 'Vancouver'],
  ['America/Mexico_City', 'Mexico City'],
  ['America/Sao_Paulo', 'São Paulo'],
  ['America/Argentina/Buenos_Aires', 'Buenos Aires'],
];

// Venue country → suggested IANA zone (primary business hub for multi-zone
// countries; organizers can always override in the dropdown).
export const COUNTRY_TZ = {
  'United Arab Emirates': 'Asia/Dubai', UAE: 'Asia/Dubai', 'Saudi Arabia': 'Asia/Riyadh', Qatar: 'Asia/Qatar',
  India: 'Asia/Kolkata', Pakistan: 'Asia/Karachi', Bangladesh: 'Asia/Dhaka', 'Sri Lanka': 'Asia/Colombo',
  Singapore: 'Asia/Singapore', Malaysia: 'Asia/Kuala_Lumpur', Thailand: 'Asia/Bangkok', Indonesia: 'Asia/Jakarta',
  Philippines: 'Asia/Manila', Vietnam: 'Asia/Ho_Chi_Minh', 'Hong Kong': 'Asia/Hong_Kong', China: 'Asia/Shanghai',
  Taiwan: 'Asia/Taipei', 'South Korea': 'Asia/Seoul', Japan: 'Asia/Tokyo', Australia: 'Australia/Sydney',
  'New Zealand': 'Pacific/Auckland', 'United Kingdom': 'Europe/London', UK: 'Europe/London', Ireland: 'Europe/Dublin',
  France: 'Europe/Paris', Germany: 'Europe/Paris', Italy: 'Europe/Paris', Netherlands: 'Europe/Amsterdam',
  Belgium: 'Europe/Amsterdam', Spain: 'Europe/Madrid', Portugal: 'Europe/Lisbon', Switzerland: 'Europe/Zurich',
  Austria: 'Europe/Vienna', Sweden: 'Europe/Stockholm', Norway: 'Europe/Oslo', Denmark: 'Europe/Copenhagen',
  Finland: 'Europe/Helsinki', Poland: 'Europe/Warsaw', Romania: 'Europe/Bucharest', Greece: 'Europe/Athens',
  Turkey: 'Europe/Istanbul', Russia: 'Europe/Moscow', Egypt: 'Africa/Cairo', Morocco: 'Africa/Casablanca',
  Nigeria: 'Africa/Lagos', Ghana: 'Africa/Accra', Kenya: 'Africa/Nairobi', Tanzania: 'Africa/Dar_es_Salaam',
  Rwanda: 'Africa/Kigali', 'South Africa': 'Africa/Johannesburg', 'United States': 'America/New_York',
  USA: 'America/New_York', Canada: 'America/Toronto', Mexico: 'America/Mexico_City', Brazil: 'America/Sao_Paulo',
  Argentina: 'America/Argentina/Buenos_Aires',
};

export function suggestTimezone(country) {
  return COUNTRY_TZ[(country || '').trim()] || null;
}
