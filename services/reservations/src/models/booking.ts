export type BookingType = 'refundable' | 'non_refundable';
export type BookingStatus = 'confirmed' | 'cancelled';
export type PaymentStatus = 'paid' | 'unpaid' | 'refunded' | 'partial_refund';

export interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  check_in: Date;
  check_out: Date;
  total_amount_usd: number;
  booking_type: BookingType;
  cancellation_penalty_pct: number;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBookingDto {
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmountUSD: number;
  bookingType: BookingType;
}

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
