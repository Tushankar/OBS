import mongoose from 'mongoose';
import { SPONSOR_TIER, PARTNER_STATUS } from '../constants.js';

const { Schema } = mongoose;

// PartnerApplication (§5.1) — the public "become a sponsor / partner" form →
// admin queue.
const partnerApplicationSchema = new Schema(
  {
    orgName: { type: String, required: true },
    contactName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    website: String,
    interestTier: { type: String, enum: SPONSOR_TIER },
    message: String,
    status: { type: String, enum: PARTNER_STATUS, default: 'NEW' },
    adminNotes: String,
    // Draft Sponsor auto-created on approval — links the lead to its showcase entry.
    sponsorId: { type: Schema.Types.ObjectId, ref: 'Sponsor' },
  },
  { timestamps: true }
);

partnerApplicationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('PartnerApplication', partnerApplicationSchema);
