import mongoose from 'mongoose';
import { PAGE_STATUS } from '../constants.js';

const { Schema } = mongoose;

const cmsPageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true }, // about, terms, privacy…
    title: { type: String, required: true },
    content: { type: String, required: true }, // markdown
    // Structured page settings the admin edits visually — hero image/eyebrow/
    // subtitle, accent color, and per-page sections (stats, mission, values,
    // milestones, leadership, roles, perks). Shape is validated in the admin
    // zod schema; consumers fall back to their built-in defaults per field.
    meta: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: PAGE_STATUS, default: 'DRAFT' },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('CmsPage', cmsPageSchema);
