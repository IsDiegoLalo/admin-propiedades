import { db } from '../db/postgres';
import { paymentGateway } from './paymentGatewayMock';
import { getPropertyInfo } from './propertiesClient';
import { ConflictError, NotFoundError, PaymentError } from '../middleware/errors';
import { logger } from '../middleware/requestLogger';
import type { Booking, BookingResponseDto } from '../models/booking';
import type { CreateBookingInput } from '../validators/bookingValidator';

// ── Helper ─────────────────────────────────────────────────────────────────────

function toResponseDto(booking: Booking): BookingResponseDto {
  const dto: BookingResponseDto = {
    id: booking.id,
    propertyId: booking.property_id,
    guestName: booking.guest_name,
    checkIn: new Date(booking.check_in).toISOString().split('T')[0]!,
    checkOut: new Date(booking.check_out).toISOString().split('T')[0]!,
    totalAmountUSD: Number(booking.total_amount_usd),
    bookingType: booking.booking_type,
    cancellationPenaltyPercent: Number(booking.cancellation_penalty_pct),
    bookingStatus: booking.booking_status,
    paymentStatus: booking.payment_status,
    createdAt: booking.created_at.toISOString(),
    updatedAt: booking.updated_at.toISOString(),
  };

  if (booking.cancelled_at) {
    dto.cancelledAt = booking.cancelled_at.toISOString();
  }

  return dto;
}

// ── Service functions ──────────────────────────────────────────────────────────

async function hasOverlap(
  propertyId: string,
  checkIn: string,
  checkOut: string,
): Promise<boolean> {
  const overlapping = await db('bookings')
    .where('property_id', propertyId)
    .where('booking_status', 'confirmed')
    .where(function () {
      this.where('check_in', '<', checkOut).andWhere('check_out', '>', checkIn);
    })
    .first();

  return Boolean(overlapping);
}

export async function createBooking(input: CreateBookingInput): Promise<BookingResponseDto> {
  // 1. Verificar solapamiento de fechas
  const overlap = await hasOverlap(input.propertyId, input.checkIn, input.checkOut);
  if (overlap) {
    throw new ConflictError('Las fechas se solapan con una reserva existente confirmada');
  }

  // 2. Obtener penalidad de cancelación desde Properties Service
  const propertyInfo = await getPropertyInfo(input.propertyId);
  const cancellationPenaltyPct = propertyInfo.cancellationPenaltyPercent;

  // 3. Transacción atómica: INSERT booking + charge
  const booking = await db.transaction(async (trx) => {
    const rows = await trx('bookings')
      .insert({
        property_id: input.propertyId,
        guest_name: input.guestName,
        check_in: input.checkIn,
        check_out: input.checkOut,
        total_amount_usd: input.totalAmountUSD,
        booking_type: input.bookingType,
        cancellation_penalty_pct: cancellationPenaltyPct,
        booking_status: 'confirmed',
        payment_status: 'paid',
      })
      .returning('*') as Booking[];

    const inserted = rows[0];
    if (!inserted) {
      throw new Error('No se pudo insertar la reserva');
    }

    // 4. Intentar cobro
    const paymentResult = await paymentGateway.charge(input.totalAmountUSD, 'USD');
    if (!paymentResult.success) {
      // Fallo de pago → rollback automático al lanzar excepción dentro de trx
      throw new PaymentError('El pago fue rechazado por el procesador');
    }

    return inserted;
  }).catch((err: unknown) => {
    // Si es PaymentError, relanzar directamente (HTTP 402)
    if (err instanceof PaymentError) {
      throw err;
    }
    // Fallo post-pago u otro error interno → HTTP 500
    logger.error({ err }, 'Error en transacción de creación de reserva');
    throw err;
  });

  return toResponseDto(booking);
}

export async function getBooking(id: string): Promise<BookingResponseDto> {
  const booking = await db<Booking>('bookings').where({ id }).first();
  if (!booking) throw new NotFoundError(`Reserva con id ${id} no encontrada`);
  return toResponseDto(booking);
}

export async function listBookingsByProperty(propertyId: string): Promise<BookingResponseDto[]> {
  const bookings = await db<Booking>('bookings')
    .where({ property_id: propertyId })
    .orderBy('created_at', 'desc');
  return bookings.map(toResponseDto);
}

export async function cancelBooking(id: string): Promise<BookingResponseDto> {
  // 1. Buscar booking
  const booking = await db<Booking>('bookings').where({ id }).first();
  if (!booking) throw new NotFoundError(`Reserva con id ${id} no encontrada`);

  if (booking.booking_status !== 'confirmed') {
    throw new ConflictError('Solo se pueden cancelar reservas con estado confirmed');
  }

  // 2. Calcular monto de reembolso
  const totalAmount = Number(booking.total_amount_usd);
  const penaltyPct = Number(booking.cancellation_penalty_pct);

  let refundAmount: number;
  let paymentStatus: 'refunded' | 'partial_refund';

  if (booking.booking_type === 'refundable') {
    refundAmount = totalAmount;
    paymentStatus = 'refunded';
  } else {
    refundAmount = Math.round(totalAmount * (1 - penaltyPct / 100) * 100) / 100;
    paymentStatus = penaltyPct > 0 ? 'partial_refund' : 'refunded';
  }

  // 3. Ejecutar reembolso via Payment Gateway
  const refundResult = await paymentGateway.refund(refundAmount, id);
  if (!refundResult.success) {
    logger.error({ bookingId: id }, 'Fallo al procesar reembolso');
    throw new PaymentError('El reembolso no pudo ser procesado');
  }

  // 4. Actualizar estado de la reserva
  const rows = await db('bookings')
    .where({ id })
    .update({
      booking_status: 'cancelled',
      payment_status: paymentStatus,
      cancelled_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*') as Booking[];

  const updated = rows[0];
  if (!updated) {
    throw new Error('No se pudo actualizar la reserva');
  }

  return toResponseDto(updated);
}
