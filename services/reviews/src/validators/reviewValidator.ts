import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

const sanitizeString = (s: string): string => DOMPurify.sanitize(s.trim());

export const createReviewSchema = z.object({
  propertyId: z.string().uuid({ message: 'propertyId debe ser un UUID válido' }),
  guestName: z
    .string()
    .min(1, { message: 'guestName no puede estar vacío' })
    .transform(sanitizeString),
  score: z
    .number()
    .int({ message: 'score debe ser un entero' })
    .min(1, { message: 'score mínimo es 1' })
    .max(5, { message: 'score máximo es 5' }),
  comment: z
    .string()
    .min(1, { message: 'comment no puede estar vacío' })
    .refine((s) => s.trim().length > 0, { message: 'comment no puede ser solo espacios' })
    .transform(sanitizeString),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
