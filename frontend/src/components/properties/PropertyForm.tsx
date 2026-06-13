import { useState } from 'react';
import type { CreatePropertyDto, UpdatePropertyDto } from '../../types';
import { ErrorAlert } from '../common/ErrorAlert';

type PropertyFormMode = 'create' | 'edit';

interface PropertyFormProps {
  mode: PropertyFormMode;
  initialData?: UpdatePropertyDto;
  initialServices?: string;
  onSubmit: (data: CreatePropertyDto | UpdatePropertyDto, services: string) => Promise<void>;
  onCancel: () => void;
  error: string | null;
}

const defaultCreateForm: CreatePropertyDto = {
  name: '',
  type: 'apartment',
  address: '',
  pricePerDayUSD: 0,
  currency: 'USD',
  rooms: 1,
  maxGuests: 1,
  cancellationPenaltyPercent: 0,
  services: [],
};

export function PropertyForm({
  mode,
  initialData,
  initialServices = '',
  onSubmit,
  onCancel,
  error,
}: PropertyFormProps) {
  const [form, setForm] = useState<CreatePropertyDto | UpdatePropertyDto>(
    initialData ?? defaultCreateForm,
  );
  const [servicesInput, setServicesInput] = useState(initialServices);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const numericFields = ['pricePerDayUSD', 'rooms', 'maxGuests', 'cancellationPenaltyPercent'];
    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const validateForm = (): string | null => {
    const f = form as CreatePropertyDto;
    if (f.name !== undefined && !f.name.trim()) return 'El nombre es obligatorio';
    if (f.address !== undefined && !f.address.trim()) return 'La dirección es obligatoria';
    if (f.pricePerDayUSD !== undefined && f.pricePerDayUSD <= 0)
      return 'El precio debe ser mayor a 0';
    if ('rooms' in f && f.rooms !== undefined && f.rooms < 1)
      return 'Debe tener al menos 1 habitación';
    if (f.maxGuests !== undefined && f.maxGuests < 1)
      return 'Debe admitir al menos 1 huésped';
    if (
      f.cancellationPenaltyPercent !== undefined &&
      (f.cancellationPenaltyPercent < 0 || f.cancellationPenaltyPercent > 100)
    ) {
      return 'La penalidad debe estar entre 0 y 100';
    }
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
      await onSubmit(form, servicesInput);
    } catch {
      // Error is handled by parent via error prop
    } finally {
      setLoading(false);
    }
  };

  const formLabel = mode === 'create' ? 'Formulario de nueva propiedad' : 'Formulario de edición de propiedad';
  const title = mode === 'create' ? 'Nueva propiedad' : 'Editar propiedad';
  const submitLabel = mode === 'create'
    ? (loading ? 'Guardando...' : 'Crear propiedad')
    : (loading ? 'Guardando...' : 'Guardar cambios');

  const idPrefix = mode === 'create' ? '' : 'edit-';
  const f = form as CreatePropertyDto;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      aria-label={formLabel}
      style={{
        border: '1px solid #ccc',
        padding: '1rem',
        marginBottom: '1rem',
        borderRadius: '4px',
      }}
    >
      <h2>{title}</h2>
      {(validationError || error) && (
        <ErrorAlert message={validationError ?? error ?? ''} />
      )}

      <div style={{ marginBottom: '0.5rem' }}>
        <label htmlFor={`${idPrefix}name`}>Nombre *</label>
        <br />
        <input
          id={`${idPrefix}name`}
          name="name"
          value={f.name ?? ''}
          onChange={handleFormChange}
          required
        />
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label htmlFor={`${idPrefix}type`}>Tipo *</label>
        <br />
        <select
          id={`${idPrefix}type`}
          name="type"
          value={f.type ?? 'apartment'}
          onChange={handleFormChange}
        >
          <option value="apartment">Departamento</option>
          <option value="house">Casa</option>
        </select>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label htmlFor={`${idPrefix}address`}>Dirección *</label>
        <br />
        <input
          id={`${idPrefix}address`}
          name="address"
          value={f.address ?? ''}
          onChange={handleFormChange}
          required
        />
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label htmlFor={`${idPrefix}pricePerDayUSD`}>Precio/día (USD) *</label>
        <br />
        <input
          id={`${idPrefix}pricePerDayUSD`}
          name="pricePerDayUSD"
          type="number"
          min="0.01"
          step="0.01"
          value={f.pricePerDayUSD ?? 0}
          onChange={handleFormChange}
          required
        />
      </div>
      {mode === 'create' && (
        <div style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="rooms">Habitaciones *</label>
          <br />
          <input
            id="rooms"
            name="rooms"
            type="number"
            min="1"
            value={(f as CreatePropertyDto).rooms ?? 1}
            onChange={handleFormChange}
            required
          />
        </div>
      )}
      <div style={{ marginBottom: '0.5rem' }}>
        <label htmlFor={`${idPrefix}maxGuests`}>Máx. huéspedes *</label>
        <br />
        <input
          id={`${idPrefix}maxGuests`}
          name="maxGuests"
          type="number"
          min="1"
          value={f.maxGuests ?? 1}
          onChange={handleFormChange}
          required
        />
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label htmlFor={`${idPrefix}cancellationPenaltyPercent`}>Penalidad cancelación (%)</label>
        <br />
        <input
          id={`${idPrefix}cancellationPenaltyPercent`}
          name="cancellationPenaltyPercent"
          type="number"
          min="0"
          max="100"
          value={f.cancellationPenaltyPercent ?? 0}
          onChange={handleFormChange}
        />
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label htmlFor={`${idPrefix}services`}>Servicios (separados por coma)</label>
        <br />
        <input
          id={`${idPrefix}services`}
          name="services"
          value={servicesInput}
          onChange={(e) => setServicesInput(e.target.value)}
          placeholder="WiFi, Piscina, Estacionamiento"
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" disabled={loading}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
