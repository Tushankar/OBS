import { SupportTicket } from '../../models/index.js';
import { writeAudit } from '../../utils/audit.js';
import { notFoundError } from '../../utils/errors.js';
import { notifyAdmins } from '../notifications/notifications.service.js';

const shapeTicket = (t) => ({
  id: t._id,
  name: t.name,
  email: t.email,
  category: t.category,
  subject: t.subject,
  message: t.message,
  status: t.status,
  adminNotes: t.adminNotes,
  user: t.userId && t.userId.name ? { id: t.userId._id, name: t.userId.name, email: t.userId.email } : undefined,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

// Public: anyone can raise a ticket; a signed-in reporter is linked to their
// account (optionalAuth sets req.user upstream).
export async function submitTicket(userId, body) {
  const ticket = await SupportTicket.create({ ...body, status: 'OPEN', userId: userId || undefined });
  await notifyAdmins({
    type: 'SUPPORT_TICKET',
    title: `New support ticket: ${ticket.subject}`,
    body: `${ticket.name} (${ticket.email})`,
    link: '/admin/support',
    entityType: 'SupportTicket',
    entityId: ticket._id,
  });
  return shapeTicket(ticket);
}

export async function adminList({ status, category, search } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ subject: rx }, { message: rx }, { name: rx }, { email: rx }];
  }
  const tickets = await SupportTicket.find(filter)
    .sort({ createdAt: -1 })
    .populate('userId', 'name email');
  return { tickets: tickets.map(shapeTicket), total: tickets.length };
}

export async function updateTicket(adminId, id, { status, adminNotes }) {
  const ticket = await SupportTicket.findById(id).populate('userId', 'name email');
  if (!ticket) throw notFoundError('TICKET_NOT_FOUND', 'Support ticket not found');
  if (status !== undefined) ticket.status = status;
  if (adminNotes !== undefined) ticket.adminNotes = adminNotes;
  await ticket.save();
  await writeAudit({
    actorId: adminId,
    action: 'SUPPORT_TICKET_UPDATED',
    entityType: 'SupportTicket',
    entityId: ticket._id,
    meta: { status: ticket.status, subject: ticket.subject },
  });
  return shapeTicket(ticket);
}
