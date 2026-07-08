import mongoose from 'mongoose';
import { EMAIL_TYPE, EMAIL_STATUS } from '../constants.js';

const { Schema } = mongoose;

const emailLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    type: { type: String, enum: EMAIL_TYPE, required: true },
    toEmail: { type: String, required: true },
    subject: String,
    status: { type: String, enum: EMAIL_STATUS, default: 'QUEUED' },
    providerMessageId: String,
    error: String,
    sentAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('EmailLog', emailLogSchema);
