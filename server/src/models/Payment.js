import mongoose from 'mongoose';
import { GATEWAY, PAYMENT_STATUS } from '../constants.js';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    gateway: { type: String, enum: GATEWAY, required: true },
    gatewayOrderId: String, // razorpay order id / stripe payment intent id
    gatewayPaymentId: { type: String, index: true, sparse: true },
    gatewaySignature: String,
    amount: { type: Number, required: true }, // paise
    currency: String,
    method: String, // upi, card, netbanking…
    status: { type: String, enum: PAYMENT_STATUS, default: 'CREATED' },
    errorCode: String,
    errorMessage: String,
    webhookPayload: Schema.Types.Mixed,
    paidAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
