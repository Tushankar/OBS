import mongoose from 'mongoose';
import { ORGANIZER_STATUS } from '../constants.js';

const { Schema } = mongoose;

const organizerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    orgName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logoUrl: String,
    bio: String,
    website: String,
    status: { type: String, enum: ORGANIZER_STATUS, default: 'PENDING' },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('OrganizerProfile', organizerProfileSchema);
