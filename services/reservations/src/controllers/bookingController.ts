import { Request, Response, NextFunction } from 'express';
import { createBookingSchema } from '../validators/bookingValidator';
import * as bookingService from '../services/bookingService';

export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createBookingSchema.parse(req.body);
    const booking = await bookingService.createBooking(input);
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
}

export async function getBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Missing booking id' });
      return;
    }
    const booking = await bookingService.getBooking(id);
    res.json(booking);
  } catch (err) {
    next(err);
  }
}

export async function listBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { propertyId } = req.query;
    const bookings = await bookingService.listBookingsByProperty(String(propertyId ?? ''));
    res.json(bookings);
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Missing booking id' });
      return;
    }
    const booking = await bookingService.cancelBooking(id);
    res.json(booking);
  } catch (err) {
    next(err);
  }
}
