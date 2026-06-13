import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Sanitiza strings eliminando HTML y whitespace extremo
const sanitizeString = (s: string): string => DOMPurify.sanitize(s.trim());

const currencyRateSchema = z.object({
  currency: z.string().min(3).max(10),
  rate: z.number().positive(),
});

export const createPropertySchema = z.object({
  name: z.string().min(1).max(255).transform(sanitizeString),
  type: z.enum(['house', 'apartment']),
  address: z.string().min(1).transform(sanitizeString),
  pricePerDayUSD: z.number().positive(),
  currency: z.string().min(3).max(10).default('USD'),
  rooms: z.number().int().positive(),
  maxGuests: z.number().int().positive(),
  cancellationPenaltyPercent: z.number().min(0).max(100).default(0),
  services: z.array(z.string().transform(sanitizeString)).default([]),
  currencyRates: z.array(currencyRateSchema).optional(),
  extendedAttributes: z.record(z.unknown()).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
