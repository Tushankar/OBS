import { Counter } from '../models/index.js';

// Atomic sequence generator (order / ticket / invoice numbering). Each named
// counter increments independently; upserts on first use.
export async function nextSeq(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
}

// Formatters for the human-facing identifiers (build plan §5).
export const formatOrderNumber = (seq, year) => `OBS-${year}-${String(seq).padStart(6, '0')}`;
export const formatTicketNumber = (seq) => `OBS-TKT-${String(seq).padStart(6, '0')}`;
export const formatInvoiceNumber = (seq, year) => `OBS-INV-${year}-${String(seq).padStart(6, '0')}`;
