import mongoose from 'mongoose';

const { Schema } = mongoose;

// Key→value platform configuration editable from the admin panel (e.g. the
// commission/service-fee policy). One document per setting key; `value` shape
// is owned and validated by the settings service.
const platformSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: {} },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('PlatformSetting', platformSettingSchema);
