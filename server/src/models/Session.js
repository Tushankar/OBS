import mongoose from 'mongoose';

const { Schema } = mongoose;

// Refresh-token session (Phase 0.3) — one row per issued refresh token (jti),
// enabling rotation + reuse detection. On /auth/refresh the presented jti is
// revoked and a fresh one issued; presenting an already-revoked jti signals
// theft → the whole chain for that user is revoked. Not in §5's list, added to
// implement the mandated refresh-token rotation.
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedByJti: String,
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
);

export default mongoose.model('Session', sessionSchema);
