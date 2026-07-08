import { OrganizerProfile, User } from '../../models/index.js';
import { notFoundError } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { sendMail } from '../../utils/mailer.js';
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
