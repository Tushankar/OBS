// Minimal .ics generator + download (Add to calendar). All-UTC timestamps.
const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s = '') => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

export function downloadIcs({ title, startAt, endAt, location, description, meetingLink, uid }) {
  // Online events carry their join link in the calendar entry too.
  const desc = [description, meetingLink ? `Join online: ${meetingLink}` : ''].filter(Boolean).join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OBS Events//EN',
    'BEGIN:VEVENT',
    `UID:${uid || Date.now()}@obs.events`,
    `DTSTAMP:${stamp(new Date())}`,
    startAt ? `DTSTART:${stamp(startAt)}` : '',
    endAt ? `DTEND:${stamp(endAt)}` : '',
    `SUMMARY:${esc(title)}`,
    location ? `LOCATION:${esc(location)}` : '',
    desc ? `DESCRIPTION:${esc(desc)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines], { type: 'text/calendar' }));
  a.download = `obs-${String(title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}
