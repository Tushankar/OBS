import { z } from 'zod';
import { CHAPTER_TYPE } from '../../constants.js';

export const listChaptersQuery = z.object({
  type: z.enum(CHAPTER_TYPE).optional(),
  tier: z.string().trim().max(20).optional(),
});
