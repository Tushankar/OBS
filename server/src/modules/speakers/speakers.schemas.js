import { z } from 'zod';

export const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });
export const slugParam = z.object({ slug: z.string().trim().min(1).max(200) });

export const listSpeakersQuery = z.object({
  q: z.string().trim().max(120).optional(),
  topic: z.string().trim().max(60).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

export const createSpeakerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  photoUrl: z.string().trim().url().max(500).optional(),
  title: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(4000).optional(),
  topics: z.array(z.string().trim().max(60)).max(20).optional(),
  linkedin: z.string().trim().url().max(300).optional(),
  twitter: z.string().trim().max(300).optional(),
  website: z.string().trim().url().max(300).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateSpeakerSchema = createSpeakerSchema.partial().refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

// Organizer speaker library — no featured/sort (those are directory controls).
export const organizerSpeakerSchema = createSpeakerSchema.omit({ isFeatured: true, sortOrder: true });
export const updateOrganizerSpeakerSchema = organizerSpeakerSchema.partial().refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });
