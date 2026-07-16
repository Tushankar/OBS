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
    // Professional application details (required for new applications at the
    // API layer; optional here so legacy profiles stay valid).
    contactName: String,
    phone: String,
    orgType: { type: String, enum: ['COMPANY', 'NONPROFIT', 'COMMUNITY', 'EDUCATION', 'INDIVIDUAL'] },
    city: String,
    socialUrl: String,
    experience: { type: String, enum: ['FIRST_TIME', 'UPTO_5', 'UPTO_20', 'OVER_20'] },
    registrationNo: String,
    status: { type: String, enum: ORGANIZER_STATUS, default: 'PENDING' },
    rejectionReason: String,
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('OrganizerProfile', organizerProfileSchema);
