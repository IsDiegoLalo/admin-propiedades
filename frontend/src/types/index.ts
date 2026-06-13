// ── Properties ───────────────────────────────────────────────────────────────

export interface RoomDto {
  id: string;
  propertyId: string;
  name: string;
  type: string;
  beds: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoReferenceDto {
  photoId: string;
  url: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

export interface PropertyResponseDto {
  id: string;
  name: string;
  type: 'house' | 'apartment';
  address: string;
  pricePerDayUSD: number;
  priceConverted?: number;
  currency: string;
  currencyFallback?: boolean;
  maxGuests: number;
  cancellationPenaltyPercent: number;
  services: string[];
  rooms: RoomDto[];
  photos: PhotoReferenceDto[];
  extendedAttributes: Record<string, unknown>;
  starRating: number | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyRateDto {
  currency: string;
  rate: number;
}

export interface CreatePropertyDto {
  name: string;
  type: 'house' | 'apartment';
  address: string;
  pricePerDayUSD: number;
  currency?: string;
  rooms: number;
  maxGuests: number;
  cancellationPenaltyPercent?: number;
  services?: string[];
  currencyRates?: CurrencyRateDto[];
  extendedAttributes?: Record<string, unknown>;
}

export interface UpdatePropertyDto {
  name?: string;
  type?: 'house' | 'apartment';
  address?: string;
  pricePerDayUSD?: number;
  currency?: string;
  maxGuests?: number;
  cancellationPenaltyPercent?: number;
  services?: string[];
  extendedAttributes?: Record<string, unknown>;
}

export interface CreateRoomDto {
  name: string;
  type: string;
  beds: number;
  description: string;
}

// ── Reservations ─────────────────────────────────────────────────────────────

export type BookingType = 'refundable' | 'non_refundable';
export type BookingStatus = 'confirmed' | 'cancelled';
export type PaymentStatus = 'paid' | 'unpaid' | 'refunded' | 'partial_refund';

export interface BookingResponseDto {
  id: string;
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmountUSD: number;
  bookingType: BookingType;
  cancellationPenaltyPercent: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingDto {
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmountUSD: number;
  bookingType: BookingType;
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export interface ReviewResponseDto {
  id: string;
  propertyId: string;
  guestName: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface CreateReviewDto {
  propertyId: string;
  guestName: string;
  score: number;
  comment: string;
}

export interface PropertyRatingDto {
  propertyId: string;
  starRating: number | null;
  reviewCount: number;
}

// ── Shared ───────────────────────────────────────────────────────────────────

export interface ValidationErrorDto {
  field: string;
  message: string;
}

export interface ErrorResponseDto {
  error: string;
  details?: ValidationErrorDto[];
}
