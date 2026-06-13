import { z } from 'zod';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createBookingSchema = z
  .object({
    propertyId: z.string().uuid({ message: 'propertyId debe ser un UUID válido' }),
    guestName: z.string().min(1, { message: 'guestName no puede estar vacío' }).max(255),
    checkIn: z.string().regex(ISO_DATE_REGEX, { message: 'checkIn debe ser una fecha ISO YYYY-MM-DD' }),
    checkOut: z.string().regex(ISO_DATE_REGEX, { message: 'checkOut debe ser una fecha ISO YYYY-MM-DD' }),
    totalAmountUSD: z.number().positive({ message: 'totalAmountUSD debe ser mayor a 0' }),
    bookingType: z.enum(['refundable', 'non_refundable'], {
      message: 'bookingType debe ser refundable o non_refundable',
    }),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: 'checkOut debe ser posterior a checkIn',
    path: ['checkOut'],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
