import { useEffect, useState, useCallback } from 'react';
import {
  listBookingsByProperty,
  createBooking as createBookingService,
  cancelBooking as cancelBookingService,
} from '../services/reservationsService';
import type { BookingResponseDto, CreateBookingDto } from '../types';

interface UseBookingsReturn {
  bookings: BookingResponseDto[];
  error: string | null;
  fetchBookings: () => Promise<void>;
  handleCreateBooking: (dto: CreateBookingDto) => Promise<void>;
  handleCancelBooking: (id: string) => Promise<void>;
}

export function useBookings(propertyId: string | undefined): UseBookingsReturn {
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!propertyId) return;
    try {
      setError(null);
      const data = await listBookingsByProperty(propertyId);
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar reservas');
    }
  }, [propertyId]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const handleCreateBooking = useCallback(
    async (dto: CreateBookingDto) => {
      await createBookingService(dto);
      await fetchBookings();
    },
    [fetchBookings],
  );

  const handleCancelBooking = useCallback(
    async (id: string) => {
      await cancelBookingService(id);
      await fetchBookings();
    },
    [fetchBookings],
  );

  return {
    bookings,
    error,
    fetchBookings,
    handleCreateBooking,
    handleCancelBooking,
  };
}
