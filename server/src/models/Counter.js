import mongoose from 'mongoose';

const { Schema } = mongoose;

// Atomic numbering for order / ticket / invoice. See utils/counters.js (§0.4).
const counterSchema = new Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

export default mongoose.model('Counter', counterSchema);
