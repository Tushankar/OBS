import mongoose from 'mongoose';
import crypto from 'crypto';
import { TICKET_STATUS } from '../constants.js';

const { Schema } = mongoose;

const ticketSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    ticketTypeId: { type: Schema.Types.ObjectId, ref: 'TicketType', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attendeeName: String, // buyer in MVP; per-attendee = v2
    attendeeEmail: String,
    ticketNumber: { type: String, required: true, unique: true }, // OBS-TKT-000001 via nextSeq('ticket')
    qrToken: { type: String, unique: true, default: () => crypto.randomUUID() },
    status: { type: String, enum: TICKET_STATUS, default: 'VALID' },
    pdfUrl: String,
    checkedInAt: Date,
    checkedInById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ticketSchema.index({ eventId: 1, status: 1 });

export default mongoose.model('Ticket', ticketSchema);
