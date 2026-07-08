import mongoose from 'mongoose';
import { REFUND_STATUS } from '../constants.js';

const { Schema } = mongoose;

const refundSchema = new Schema(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    amount: { type: Number, required: true }, // paise
    reason: { type: String, required: true },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: REFUND_STATUS, default: 'REQUESTED' },
    gatewayRefundId: String,
    adminNotes: String,
    processedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Refund', refundSchema);
