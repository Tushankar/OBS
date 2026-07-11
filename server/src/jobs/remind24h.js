import { Event, Ticket } from '../models/index.js';
import { sendMail } from '../utils/mailer.js';
import { env } from '../config/env.js';

// §8.6 remind24h (hourly): PUBLISHED events starting in ~24h (window
// [now+23.5h, now+24.5h]) that haven't been reminded yet → EVENT_REMINDER to
// every VALID ticket holder. The reminderSentAt claim happens BEFORE sending
// (conditional flip) so a re-run or overlapping worker can't double-send.
export async function remind24h(now = new Date()) {
  const lo = new Date(now.getTime() + 23.5 * 3600e3);
  const hi = new Date(now.getTime() + 24.5 * 3600e3);
  const events = await Event.find({ status: 'PUBLISHED', reminderSentAt: null, startAt: { $gte: lo, $lte: hi } }).limit(200);

  let reminded = 0;
  for (const ev of events) {
    // Claim first — the atomic guard gates single execution.
    const claim = await Event.updateOne({ _id: ev._id, reminderSentAt: null }, { $set: { reminderSentAt: new Date() } });
    if (claim.modifiedCount !== 1) continue;

    const tickets = await Ticket.find({ eventId: ev._id, status: 'VALID' }).select('attendeeEmail attendeeName userId');
    const when = ev.startAt ? new Date(ev.startAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }) : 'soon';
    // Online events get the actual join link (§F6) — never promise a link we can't show.
    const joinLink = ev.isOnline && ev.meetingLink ? ev.meetingLink : null;
    const where = ev.isOnline
      ? joinLink ? `Online — join here: ${joinLink}` : 'Online event'
      : [ev.venueName, ev.city].filter(Boolean).join(', ') || 'see event page';
    const whereHtml = ev.isOnline
      ? joinLink ? `Online — <a href="${joinLink}">join the event here</a>` : 'Online event'
      : where;
    const url = `${env.APP_URL}/event/${ev.slug}`;

    const seen = new Set();
    for (const t of tickets) {
      const email = t.attendeeEmail;
      if (!email || seen.has(email.toLowerCase())) continue;
      seen.add(email.toLowerCase());
      try {
        await sendMail({
          to: email, type: 'EVENT_REMINDER', subject: `Reminder: ${ev.title} is tomorrow`,
          userId: t.userId, eventId: ev._id,
          text: `Hi ${t.attendeeName || 'there'},\n\nJust a reminder that "${ev.title}" starts ${when}.\nWhere: ${where}\n\nDetails & your tickets: ${url}\n\nSee you there!\n— OBS Events`,
          html: `<p>Hi ${t.attendeeName || 'there'},</p><p>Just a reminder that <strong>${ev.title}</strong> starts <strong>${when}</strong>.</p><p><strong>Where:</strong> ${whereHtml}</p><p><a href="${url}">View event & your tickets</a></p><p>See you there!<br/>— OBS Events</p>`,
        });
        reminded += 1;
      } catch (e) {
        console.error(`[cron remind24h] mail to ${email} failed:`, e.message);
      }
    }
  }
  if (reminded) console.log(`[cron remind24h] sent ${reminded} reminder(s) across ${events.length} event(s)`);
  return reminded;
}
