import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

const sanitizeString = (s: string): string => DOMPurify.sanitize(s.trim());

export const createRoomSchema = z.object({
  name: z.string().min(1).max(255).transform(sanitizeString),
  type: z.string().min(1).max(100).transform(sanitizeString),
  beds: z.number().int().positive(),
  description: z.string().min(1).transform(sanitizeString),
});

export const updateRoomSchema = createRoomSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
