import { OrganizerProfile } from '../../models/index.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { conflict } from '../../utils/errors.js';

// Client-facing shape of an organizer profile (own view / admin list).
export function publicOrganizer(p) {
  return {
    id: String(p._id),
    userId: String(p.userId),
    orgName: p.orgName,
    slug: p.slug,
    logoUrl: p.logoUrl || null,
    bio: p.bio || null,
    website: p.website || null,
    status: p.status,
    approvedAt: p.approvedAt || null,
    createdAt: p.createdAt,
  };
}

// A signed-in USER applies to become an organizer. Creates a PENDING profile.
// The user's role stays USER until an admin approves (see admin.service). A
// previously REJECTED applicant may re-apply (we reset the same row to PENDING).
export async function apply(userId, { orgName, bio, website }) {
  const existing = await OrganizerProfile.findOne({ userId });
  if (existing) {
    if (existing.status === 'PENDING') {
      throw conflict('APPLICATION_PENDING', 'You already have an application under review');
    }
    if (existing.status === 'APPROVED') {
      throw conflict('ALREADY_ORGANIZER', 'You are already an approved organizer');
    }
    if (existing.status === 'SUSPENDED') {
      throw conflict('ORGANIZER_SUSPENDED', 'Your organizer account is suspended — contact support');
    }
    // REJECTED → allow a fresh application on the same (unique) userId row.
    existing.orgName = orgName;
    existing.bio = bio;
    existing.website = website;
    existing.status = 'PENDING';
    existing.approvedById = undefined;
    existing.approvedAt = undefined;
    await existing.save();
    return publicOrganizer(existing);
  }

  const slug = await uniqueSlug(OrganizerProfile, orgName);
  const profile = await OrganizerProfile.create({ userId, orgName, slug, bio, website, status: 'PENDING' });
  return publicOrganizer(profile);
}

// The caller's own organizer profile, or null if they have not applied.
export async function getMyProfile(userId) {
  const profile = await OrganizerProfile.findOne({ userId });
  return profile ? publicOrganizer(profile) : null;
}
