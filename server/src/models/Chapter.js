import mongoose from 'mongoose';
import { CHAPTER_TYPE, CHAPTER_STATUS } from '../constants.js';

const { Schema } = mongoose;

const chapterSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    type: { type: String, enum: CHAPTER_TYPE, required: true },
    tier: String, // T1..T5 / Growth — country chapters only
    pillarGroup: String, // strategic sub-group (Strategic Expansion only)
    ecosystemTier: String, // A..E — OBS Ecosystem Structure (Appendix A)
    countryCode: String,
    flagEmoji: String,
    description: String,
    coverUrl: String,
    isFlagship: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // §5.1 additions — needed now because the 108 seeded chapters are official.
    createdById: { type: Schema.Types.ObjectId, ref: 'User' }, // null for seeded/official
    isOfficial: { type: Boolean, default: false },
    status: { type: String, enum: CHAPTER_STATUS, default: 'APPROVED' },
  },
  { timestamps: true }
);

export default mongoose.model('Chapter', chapterSchema);
