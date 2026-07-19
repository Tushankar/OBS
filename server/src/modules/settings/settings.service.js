import { PlatformSetting, OrganizerProfile } from '../../models/index.js';
import { writeAudit } from '../../utils/audit.js';
import { env } from '../../config/env.js';

// Commission / service-fee policy — admin-editable (Admin → Commissions).
// Resolution order at checkout:
//   1. master switch off            → 0%
//   2. platform's own events        → obsPercent   (organizer slug 'obs-events')
//   3. organizer has an override    → commissionPercent (0 = exempt)
//   4. otherwise                    → partnerPercent (platform default)
// SERVICE_FEE_PERCENT from .env seeds the initial defaults only; after that
// the admin panel owns the numbers.

const KEY = 'commission';
const DEFAULTS = () => ({
  enabled: true,
  partnerPercent: Number(env.SERVICE_FEE_PERCENT) || 0,
  obsPercent: 0,
});

// Small read-through cache — checkout hits this on every order.
let cache = null;
let cacheAt = 0;
const CACHE_MS = 30 * 1000;

function shape(value = {}) {
  const d = DEFAULTS();
  const num = (v, fb) => (typeof v === 'number' && v >= 0 && v <= 100 ? v : fb);
  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : d.enabled,
    partnerPercent: num(value.partnerPercent, d.partnerPercent),
    obsPercent: num(value.obsPercent, d.obsPercent),
  };
}

export async function getCommissionSettings({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const doc = await PlatformSetting.findOne({ key: KEY });
  cache = shape(doc?.value);
  cacheAt = Date.now();
  return cache;
}

export async function updateCommissionSettings(adminId, patch) {
  const current = await getCommissionSettings({ fresh: true });
  const next = shape({ ...current, ...patch });
  await PlatformSetting.updateOne(
    { key: KEY },
    { $set: { value: next, updatedById: adminId } },
    { upsert: true }
  );
  cache = next;
  cacheAt = Date.now();
  await writeAudit({ actorId: adminId, action: 'COMMISSION_SETTINGS_UPDATED', entityType: 'PlatformSetting', meta: next });
  return next;
}

// Admin sets/clears a per-organizer override (null = back to platform default).
export async function setOrganizerCommission(adminId, organizerId, commissionPercent) {
  const profile = await OrganizerProfile.findById(organizerId);
  if (!profile) return null;
  profile.commissionPercent = commissionPercent === null ? null : Math.min(100, Math.max(0, Number(commissionPercent)));
  await profile.save();
  await writeAudit({
    actorId: adminId, action: 'ORGANIZER_COMMISSION_SET', entityType: 'OrganizerProfile', entityId: profile._id,
    meta: { orgName: profile.orgName, commissionPercent: profile.commissionPercent },
  });
  return profile;
}

// The effective service-fee percent for an event's organizer — the ONE place
// checkout and the public event payload get their number from.
export async function effectiveServiceFeePercent(organizerId) {
  const settings = await getCommissionSettings();
  if (!settings.enabled) return 0;
  if (!organizerId) return settings.partnerPercent;
  const org = await OrganizerProfile.findById(organizerId).select('slug commissionPercent');
  if (!org) return settings.partnerPercent;
  if (org.slug === 'obs-events') return settings.obsPercent; // platform's own events
  if (typeof org.commissionPercent === 'number') return org.commissionPercent; // per-org override (0 = exempt)
  return settings.partnerPercent;
}
