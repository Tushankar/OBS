import mongoose from 'mongoose';
import { ROLE, USER_STATUS } from '../constants.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: String,
    passwordHash: String, // null for Google-only accounts
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: String,
    role: { type: String, enum: ROLE, default: 'USER' },
    status: { type: String, enum: USER_STATUS, default: 'ACTIVE' },
    emailVerifiedAt: Date,
    // Marketing consent — campaigns skip anyone opted out (transactional mail
    // is unaffected). Toggled from Profile or the email unsubscribe link.
    marketingOptIn: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
