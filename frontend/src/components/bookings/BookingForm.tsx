import { useState } from 'react';
import type { BookingType } from '../../types';
import { ErrorAlert } from '../common/ErrorAlert';

interface BookingFormData {
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmountUSD: number;
  bookingType: BookingType;
}

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => Promise<void>;
  onCancel: () => void;
  error: string | null;
}

const initialForm: BookingFormData = {
  guestName: '',
  checkIn: '',
  checkOut: '',
  totalAmountUSD: 0,
  bookingType: 'refundable',
};

export function BookingForm({ onSubmit, onCancel, error }: BookingFormProps) {
  const [form, setForm] = useState<BookingFormData>(initialForm);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setValidationError(validationErr);
      return;
    }
    setValidationError(null);
    setLoading(true);
    try {
      await onSubmit(form);
      setForm(initialForm);
    } catch {
      // Error handled by parent via error prop
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      aria-label="Formulario de nueva reserva"
      style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}
    >
      <h2>Nueva reserva</h2>
      {(validationError || error) && (
        <ErrorAlert message={validationError ?? error ?? ''} />
      )}

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

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear reserva'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
