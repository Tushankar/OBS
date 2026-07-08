import mongoose from 'mongoose';
import { PAGE_STATUS } from '../constants.js';

const { Schema } = mongoose;

const cmsPageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true }, // about, terms, privacy…
    title: { type: String, required: true },
    content: { type: String, required: true }, // markdown
    status: { type: String, enum: PAGE_STATUS, default: 'DRAFT' },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('CmsPage', cmsPageSchema);
