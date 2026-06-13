import { AxiosError } from 'axios';
import { reservationsApi } from '../config/api';
import type { BookingResponseDto, CreateBookingDto } from '../types';

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as { error?: string };
    return data.error ?? 'Error desconocido';
  }
  return 'Error de conexión con el servidor';
}

export async function createBooking(dto: CreateBookingDto): Promise<BookingResponseDto> {
  try {
    const { data } = await reservationsApi.post<BookingResponseDto>('/bookings', dto);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getBooking(id: string): Promise<BookingResponseDto> {
  try {
    const { data } = await reservationsApi.get<BookingResponseDto>(`/bookings/${id}`);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function listBookingsByProperty(
  propertyId: string,
): Promise<BookingResponseDto[]> {
  try {
    const { data } = await reservationsApi.get<BookingResponseDto[]>('/bookings', {
      params: { propertyId },
    });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function cancelBooking(id: string): Promise<BookingResponseDto> {
  try {
    const { data } = await reservationsApi.delete<BookingResponseDto>(`/bookings/${id}`);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}
