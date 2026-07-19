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

// TTL: let Mongo purge sessions once they pass expiresAt (a new row is written
// on every login + refresh, so without this the collection grows unbounded).
// Revoked-but-unexpired rows linger until their 30d expiry — fine, they're
// already inert (reuse detection keys off revokedAt, not row presence).
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Session', sessionSchema);
