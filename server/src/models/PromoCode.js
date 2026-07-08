import mongoose from 'mongoose';
import { DISCOUNT_TYPE } from '../constants.js';

const { Schema } = mongoose;

const promoCodeSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    discountType: { type: String, enum: DISCOUNT_TYPE, required: true },
    discountValue: { type: Number, required: true }, // percent value or flat paise
    maxUses: Number,
    usedCount: { type: Number, default: 0 },
    minOrderAmount: Number, // paise
    validFrom: Date,
    validUntil: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

promoCodeSchema.index({ eventId: 1, code: 1 }, { unique: true });

export default mongoose.model('PromoCode', promoCodeSchema);
