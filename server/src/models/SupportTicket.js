import mongoose from 'mongoose';
import { SUPPORT_STATUS, SUPPORT_CATEGORY } from '../constants.js';

const { Schema } = mongoose;

// SupportTicket — the public "report an issue" form (footer / help centre) →
// admin support inbox. userId is set when the reporter was signed in, so the
// admin view can link straight to the account.
const supportTicketSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    category: { type: String, enum: SUPPORT_CATEGORY, default: 'OTHER' },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: SUPPORT_STATUS, default: 'OPEN' },
    adminNotes: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
