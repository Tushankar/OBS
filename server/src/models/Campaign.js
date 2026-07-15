import mongoose from 'mongoose';
import { CAMPAIGN_STATUS, CAMPAIGN_AUDIENCE } from '../constants.js';

const { Schema } = mongoose;

// Admin email campaign — an announcement blast (typically a new-event launch)
// sent to a chosen audience. Each recipient send is recorded in EmailLog
// (type CAMPAIGN), so delivery is auditable per person; the campaign row keeps
// the aggregate counts.
const campaignSchema = new Schema(
  {
    subject: { type: String, required: true },
    body: { type: String, required: true }, // plain text; rendered to simple HTML on send
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' }, // optional featured event (CTA block)
    audience: { type: String, enum: CAMPAIGN_AUDIENCE, default: 'ALL_USERS' },
    audienceEventId: { type: Schema.Types.ObjectId, ref: 'Event' }, // when audience = EVENT_ATTENDEES
    status: { type: String, enum: CAMPAIGN_STATUS, default: 'DRAFT' },
    recipientCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    sentAt: Date,
    createdById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Campaign', campaignSchema);
