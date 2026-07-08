import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// qrToken may arrive as the raw token or the full /t/<token> URL (scanner) —
// the service normalizes it. Allow a generous length.
export const checkinSchema = z.object({
  qrToken: z.string().trim().min(8).max(300),
  eventId: objectId.optional(),
});

export const idParam = z.object({ id: objectId });
