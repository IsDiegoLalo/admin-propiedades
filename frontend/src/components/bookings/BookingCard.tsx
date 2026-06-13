import type { BookingResponseDto } from '../../types';

interface BookingCardProps {
  booking: BookingResponseDto;
  onCancel: (id: string) => void;
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
  };
  return labels[status] ?? status;
}

function formatPaymentStatus(status: string): string {
  const labels: Record<string, string> = {
    paid: 'Pagado',
    unpaid: 'No pagado',
    refunded: 'Reembolsado',
    partial_refund: 'Reembolso parcial',
  };
  return labels[status] ?? status;
}

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  return (
    <li
      style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}
    >
      <strong>{booking.guestName}</strong>
      {' — '}
      <span
        style={{
          color: booking.bookingStatus === 'confirmed' ? 'green' : 'gray',
          fontWeight: 'bold',
        }}
      >
        {formatStatus(booking.bookingStatus)}
      </span>
      <br />
      <span>
        {booking.checkIn} → {booking.checkOut}
      </span>
      <br />
      <span>USD {booking.totalAmountUSD}</span>
      {' · '}
      <span>{booking.bookingType === 'refundable' ? 'Reembolsable' : 'No reembolsable'}</span>
      {' · '}
      <span>{formatPaymentStatus(booking.paymentStatus)}</span>
      {booking.cancelledAt && (
        <>
          <br />
          <span style={{ fontSize: '0.85rem', color: '#666' }}>
            Cancelada el: {new Date(booking.cancelledAt).toLocaleDateString()}
          </span>
        </>
      )}
      {booking.bookingStatus === 'confirmed' && (
        <div style={{ marginTop: '0.5rem' }}>
          <button
            onClick={() => onCancel(booking.id)}
            style={{ color: 'red' }}
            aria-label={`Cancelar reserva de ${booking.guestName}`}
          >
            Cancelar reserva
          </button>
        </div>
      )}
    </li>
  );
}
