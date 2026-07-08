import { AuditLog } from '../models/index.js';

// Record an admin/privileged mutation. The plan (§7 Admin) requires every admin
// mutation to write an AuditLog row. Best-effort: a logging failure must never
// break the underlying action, so we swallow errors after warning.
export async function writeAudit({ actorId, action, entityType, entityId, meta }) {
  try {
    await AuditLog.create({ actorId, action, entityType, entityId: entityId ? String(entityId) : undefined, meta });
  } catch (err) {
    console.error('[audit] failed to write audit log:', err.message);
  }
}
