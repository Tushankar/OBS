import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // EVENT_APPROVED, USER_SUSPENDED…
    entityType: String,
    entityId: String,
    meta: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.model('AuditLog', auditLogSchema);
