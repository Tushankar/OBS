import mongoose from 'mongoose';
import { SPONSOR_TIER, SPONSOR_SCOPE, SPONSOR_STATUS } from '../constants.js';

const { Schema } = mongoose;

// Sponsor (§5.1). scope PLATFORM (site-wide showcase) / PROGRAM (a 100 Days
// edition) / EVENT (a single event, queried by eventId — no array on Event).
const sponsorSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logoUrl: String,
    website: String,
    tier: { type: String, enum: SPONSOR_TIER, required: true },
    scope: { type: String, enum: SPONSOR_SCOPE, default: 'PLATFORM' },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' }, // when scope = EVENT
    programId: { type: Schema.Types.ObjectId, ref: 'Program' }, // when scope = PROGRAM
    // Moderation: admin-created default APPROVED; organizer-submitted start PENDING
    // and only appear publicly once approved.
    status: { type: String, enum: SPONSOR_STATUS, default: 'APPROVED' },
    organizerId: { type: Schema.Types.ObjectId, ref: 'OrganizerProfile' }, // set when an organizer submitted it
    blurb: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sponsorSchema.index({ scope: 1, status: 1, isActive: 1, sortOrder: 1 });
sponsorSchema.index({ eventId: 1 });

export default mongoose.model('Sponsor', sponsorSchema);
