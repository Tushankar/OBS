import mongoose from 'mongoose';

const { Schema } = mongoose;

// PromoGrant — a promo code personally granted to a user (loyalty/regulars
// campaigns from Admin → Users → Top bookers). Grants surface under the
// user's "My promo codes" account page and as one-tap chips at booking time.
// One grant per (user, code); re-sending just refreshes emailedAt.
const promoGrantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    promoCodeId: { type: Schema.Types.ObjectId, ref: 'PromoCode', required: true },
    grantedById: { type: Schema.Types.ObjectId, ref: 'User' },
    note: String, // optional personal line included in the email
    emailedAt: Date,
  },
  { timestamps: true }
);

promoGrantSchema.index({ userId: 1, promoCodeId: 1 }, { unique: true });
promoGrantSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('PromoGrant', promoGrantSchema);
