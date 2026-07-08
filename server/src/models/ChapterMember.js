import mongoose from 'mongoose';

const { Schema } = mongoose;

const chapterMemberSchema = new Schema(
  {
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

chapterMemberSchema.index({ chapterId: 1, userId: 1 }, { unique: true });

export default mongoose.model('ChapterMember', chapterMemberSchema);
