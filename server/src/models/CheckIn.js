import mongoose from 'mongoose';

const { Schema } = mongoose;

// One row per ticket per event day the holder entered. Multi-day events need
// re-entry across days, so the single VALID→USED flip on Ticket can't carry
// attendance — this collection does. The unique (ticketId, dayNumber) index is
// the atomic guard against double check-in on the same day.
const checkInSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    dayNumber: { type: Number, required: true, min: 1 }, // 1-based event day
    checkedInById: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

checkInSchema.index({ ticketId: 1, dayNumber: 1 }, { unique: true });
checkInSchema.index({ eventId: 1, dayNumber: 1 });

export default mongoose.model('CheckIn', checkInSchema);
