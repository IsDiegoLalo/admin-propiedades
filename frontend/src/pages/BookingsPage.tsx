import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  listBookingsByProperty,
  createBooking,
  cancelBooking,
} from '../services/reservationsService';
import type { BookingResponseDto, BookingType } from '../types';

interface BookingForm {
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmountUSD: number;
  bookingType: BookingType;
}

const initialForm: BookingForm = {
  guestName: '',
  checkIn: '',
  checkOut: '',
  totalAmountUSD: 0,
  bookingType: 'refundable',
};

export default function BookingsPage() {
  const { id: propertyId } = useParams<{ id: string }>();

  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BookingForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBookings = async () => {
    if (!propertyId) return;
    try {
      const data = await listBookingsByProperty(propertyId);
      setBookings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar reservas');
    }
  };

  useEffect(() => {
    void fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'totalAmountUSD' ? Number(value) : value,
    }));
  };

  const validateForm = (): string | null => {
    if (!form.guestName.trim()) return 'El nombre del huésped es obligatorio';
    if (!form.checkIn) return 'La fecha de check-in es obligatoria';
    if (!form.checkOut) return 'La fecha de check-out es obligatoria';
    if (form.checkOut <= form.checkIn) return 'La fecha de check-out debe ser posterior a check-in';
    if (form.totalAmountUSD <= 0) return 'El monto total debe ser mayor a 0';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setFormError(validationErr);
      return;
    }
    if (!propertyId) return;
    setFormError(null);
    setLoading(true);
    try {
      await createBooking({
        propertyId,
        guestName: form.guestName,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        totalAmountUSD: form.totalAmountUSD,
        bookingType: form.bookingType,
      });
      setForm(initialForm);
      setShowForm(false);
      await fetchBookings();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('¿Confirmar cancelación de la reserva?')) return;
    try {
      await cancelBooking(bookingId);
      await fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar reserva');
    }
  };

  const formatStatus = (status: string): string => {
    const labels: Record<string, string> = {
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
    };
    return labels[status] ?? status;
  };

  const formatPaymentStatus = (status: string): string => {
    const labels: Record<string, string> = {
      paid: 'Pagado',
      unpaid: 'No pagado',
      refunded: 'Reembolsado',
      partial_refund: 'Reembolso parcial',
    };
    return labels[status] ?? status;
  };

  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <Link to={`/properties/${propertyId}`} style={{ display: 'inline-block', marginBottom: '1rem' }}>
        ← Volver a propiedad
      </Link>

      <h1>Reservas</h1>

      {error && <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: '1rem' }}>
        {showForm ? 'Cancelar' : 'Nueva reserva'}
      </button>

      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          aria-label="Formulario de nueva reserva"
          style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}
        >
          <h2>Nueva reserva</h2>
          {formError && <div role="alert" style={{ color: 'red', marginBottom: '0.5rem' }}>{formError}</div>}

          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="guestName">Nombre del huésped *</label><br />
            <input
              id="guestName"
              name="guestName"
              value={form.guestName}
              onChange={handleFormChange}
              required
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="checkIn">Check-in *</label><br />
            <input
              id="checkIn"
              name="checkIn"
              type="date"
              value={form.checkIn}
              onChange={handleFormChange}
              required
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="checkOut">Check-out *</label><br />
            <input
              id="checkOut"
              name="checkOut"
              type="date"
              value={form.checkOut}
              onChange={handleFormChange}
              required
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="totalAmountUSD">Monto total (USD) *</label><br />
            <input
              id="totalAmountUSD"
              name="totalAmountUSD"
              type="number"
              min="0.01"
              step="0.01"
              value={form.totalAmountUSD}
              onChange={handleFormChange}
              required
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="bookingType">Tipo de reserva *</label><br />
            <select
              id="bookingType"
              name="bookingType"
              value={form.bookingType}
              onChange={handleFormChange}
            >
              <option value="refundable">Reembolsable</option>
              <option value="non_refundable">No reembolsable</option>
            </select>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear reserva'}
          </button>
        </form>
      )}

      {bookings.length === 0 ? (
        <p>No hay reservas para esta propiedad.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {bookings.map((b) => (
            <li
              key={b.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '1rem',
                marginBottom: '0.75rem',
              }}
            >
              <strong>{b.guestName}</strong>
              {' — '}
              <span
                style={{
                  color: b.bookingStatus === 'confirmed' ? 'green' : 'gray',
                  fontWeight: 'bold',
                }}
              >
                {formatStatus(b.bookingStatus)}
              </span>
              <br />
              <span>
                {b.checkIn} → {b.checkOut}
              </span>
              <br />
              <span>USD {b.totalAmountUSD}</span>
              {' · '}
              <span>{b.bookingType === 'refundable' ? 'Reembolsable' : 'No reembolsable'}</span>
              {' · '}
              <span>{formatPaymentStatus(b.paymentStatus)}</span>
              {b.cancelledAt && (
                <>
                  <br />
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    Cancelada el: {new Date(b.cancelledAt).toLocaleDateString()}
                  </span>
                </>
              )}
              {b.bookingStatus === 'confirmed' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    onClick={() => void handleCancel(b.id)}
                    style={{ color: 'red' }}
                  >
                    Cancelar reserva
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
