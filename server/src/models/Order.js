import mongoose from 'mongoose';
import { ORDER_STATUS, GATEWAY } from '../constants.js';

const { Schema } = mongoose;

// items and invoice are EMBEDDED subdocuments (the Mongo-idiomatic change, §5).
const orderItemSchema = new Schema(
  {
    ticketTypeId: { type: Schema.Types.ObjectId, ref: 'TicketType', required: true },
    name: String, // ticket-type name snapshot
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true }, // snapshot at purchase, paise
    totalPrice: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true }, // OBS-2026-000001 via nextSeq('order')
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    promoCodeId: { type: Schema.Types.ObjectId, ref: 'PromoCode' },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true }, // all money fields: paise
    discountAmount: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ORDER_STATUS, default: 'PENDING' },
    gateway: { type: String, enum: GATEWAY, required: true },
    expiresAt: Date,
    paidAt: Date,
    invoice: { invoiceNumber: String, pdfUrl: String, issuedAt: Date }, // set at fulfilment
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ eventId: 1, status: 1 });
orderSchema.index({ status: 1, expiresAt: 1 }); // expiry cron scan

export default mongoose.model('Order', orderSchema);
