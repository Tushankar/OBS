import mongoose from 'mongoose';
import { DISCOUNT_TYPE, PROMO_SCOPE } from '../constants.js';

const { Schema } = mongoose;

const promoCodeSchema = new Schema(
  {
    // EVENT-scoped codes carry an eventId (organizer-owned). PLATFORM-scoped
    // codes apply to every event and are admin-owned (eventId is null).
    scope: { type: String, enum: PROMO_SCOPE, default: 'EVENT', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' }, // required when scope === 'EVENT'
    createdById: { type: Schema.Types.ObjectId, ref: 'User' }, // admin who created a platform code
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

// One code per event (eventId set), and one platform code per code string
// (eventId null indexes as a single null → uniqueness holds for PLATFORM too).
promoCodeSchema.index({ eventId: 1, code: 1 }, { unique: true });

export default mongoose.model('PromoCode', promoCodeSchema);
