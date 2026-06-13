import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBookings } from '../hooks/useBookings';
import { BookingForm } from '../components/bookings/BookingForm';
import { BookingList } from '../components/bookings/BookingList';
import { ErrorAlert } from '../components/common/ErrorAlert';
import type { BookingType } from '../types';

export default function BookingsPage() {
  const { id: propertyId } = useParams<{ id: string }>();
  const { bookings, error, handleCreateBooking, handleCancelBooking } = useBookings(propertyId);

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmitBooking = async (data: {
    guestName: string;
    checkIn: string;
    checkOut: string;
    totalAmountUSD: number;
    bookingType: BookingType;
  }) => {
    if (!propertyId) return;
    setFormError(null);
    try {
      await handleCreateBooking({
        propertyId,
        guestName: data.guestName,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalAmountUSD: data.totalAmountUSD,
        bookingType: data.bookingType,
      });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear reserva');
      throw err;
    }
  };

  const onCancelBooking = async (bookingId: string) => {
    if (!window.confirm('¿Confirmar cancelación de la reserva?')) return;
    try {
      await handleCancelBooking(bookingId);
    } catch {
      // Error handled by hook
    }
  };

  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <Link to={`/properties/${propertyId}`} style={{ display: 'inline-block', marginBottom: '1rem' }}>
        ← Volver a propiedad
      </Link>

      <h1>Reservas</h1>

      {error && <ErrorAlert message={error} />}

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: '1rem' }}>
        {showForm ? 'Cancelar' : 'Nueva reserva'}
      </button>

      {showForm && (
        <BookingForm
          onSubmit={onSubmitBooking}
          onCancel={() => setShowForm(false)}
          error={formError}
        />
      )}

      <BookingList
        bookings={bookings}
        onCancel={(id) => void onCancelBooking(id)}
      />
    </main>
  );
}
