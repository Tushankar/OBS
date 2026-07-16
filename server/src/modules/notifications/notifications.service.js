import { Notification } from '../../models/index.js';

const shape = (n) => ({
  id: n._id,
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  read: n.read,
  createdAt: n.createdAt,
});

// Fire-and-forget — a notification failure must never break the action that
// triggered it (same rule as writeAudit).
export async function notifyAdmins({ type, title, body, link, entityType, entityId }) {
  try {
    await Notification.create({ audience: 'ADMIN', type, title, body, link, entityType, entityId });
  } catch (err) {
    console.error('[notifications] failed to create notification:', err.message);
  }
}

export async function listAdmin({ limit = 20 } = {}) {
  const [notifications, unread] = await Promise.all([
    Notification.find({ audience: 'ADMIN' }).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ audience: 'ADMIN', read: false }),
  ]);
  return { notifications: notifications.map(shape), unread };
}

export async function markRead(id) {
  await Notification.updateOne({ _id: id, audience: 'ADMIN' }, { $set: { read: true } });
  return { ok: true };
}

export async function markAllRead() {
  await Notification.updateMany({ audience: 'ADMIN', read: false }, { $set: { read: true } });
  return { ok: true };
}
