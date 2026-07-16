import mongoose from 'mongoose';

const { Schema } = mongoose;

const ticketTypeSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true }, // General, VIP, Early Bird…
    description: String,
    price: { type: Number, required: true, min: 0 }, // paise; 0 = free ticket
    quantityTotal: { type: Number, required: true },
    quantitySold: { type: Number, default: 0 },
    minPerOrder: { type: Number, default: 1 },
    maxPerOrder: { type: Number, default: 10 },
    saleStartAt: Date,
    saleEndAt: Date,
    // Multi-day events: which event days (1-based, relative to startAt) this
    // ticket admits. Empty = every day (an all-days / full pass).
    validDays: { type: [Number], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('TicketType', ticketTypeSchema);
