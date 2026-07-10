import mongoose from 'mongoose';
import { ARTICLE_TYPE, ARTICLE_STATUS } from '../constants.js';

const { Schema } = mongoose;

// Article (§5.1) — news / articles / press. Admin-managed; public sees PUBLISHED.
const articleSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    coverUrl: String,
    excerpt: String,
    content: String, // markdown
    type: { type: String, enum: ARTICLE_TYPE, default: 'ARTICLE' },
    status: { type: String, enum: ARTICLE_STATUS, default: 'DRAFT' },
    authorName: String,
    tags: [String],
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
    publishedAt: Date,
    updatedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ type: 1, status: 1 });

export default mongoose.model('Article', articleSchema);
