import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listProperties, createProperty, deleteProperty } from '../services/propertiesService';
import type { PropertyResponseDto, CreatePropertyDto } from '../types';

const initialForm: CreatePropertyDto = {
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

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyResponseDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreatePropertyDto>(initialForm);
  const [servicesInput, setServicesInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProperties = async () => {
    try {
      setError(null);
      const data = await listProperties();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propiedades');
    }
  };

  useEffect(() => {
    void fetchProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    if (!searchTerm.trim()) return properties;
    const term = searchTerm.toLowerCase();
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.address.toLowerCase().includes(term) ||
        p.type.toLowerCase().includes(term) ||
        p.services.some((s) => s.toLowerCase().includes(term)),
    );
  }, [properties, searchTerm]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const numericFields = ['pricePerDayUSD', 'rooms', 'maxGuests', 'cancellationPenaltyPercent'];
    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'El nombre es obligatorio';
    if (!form.address.trim()) return 'La dirección es obligatoria';
    if (form.pricePerDayUSD <= 0) return 'El precio debe ser mayor a 0';
    if (form.rooms < 1) return 'Debe tener al menos 1 habitación';
    if (form.maxGuests < 1) return 'Debe admitir al menos 1 huésped';
    if (
      form.cancellationPenaltyPercent !== undefined &&
      (form.cancellationPenaltyPercent < 0 || form.cancellationPenaltyPercent > 100)
    ) {
      return 'La penalidad debe estar entre 0 y 100';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setFormError(validationErr);
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      const payload: CreatePropertyDto = {
        ...form,
        services: servicesInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await createProperty(payload);
      setForm(initialForm);
      setServicesInput('');
      setShowForm(false);
      await fetchProperties();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear propiedad');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Confirmar eliminación de la propiedad?')) return;
    try {
      await deleteProperty(id);
      await fetchProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Propiedades</h1>

      {error && (
        <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Buscar por nombre, dirección, tipo o servicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar propiedades"
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nueva propiedad'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          aria-label="Formulario de nueva propiedad"
          style={{
            border: '1px solid #ccc',
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '4px',
          }}
        >
          <h2>Nueva propiedad</h2>
          {formError && (
            <div role="alert" style={{ color: 'red', marginBottom: '0.5rem' }}>
              {formError}
            </div>
          )}

          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="name">Nombre *</label>
            <br />
            <input id="name" name="name" value={form.name} onChange={handleFormChange} required />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="type">Tipo *</label>
            <br />
            <select id="type" name="type" value={form.type} onChange={handleFormChange}>
              <option value="apartment">Departamento</option>
              <option value="house">Casa</option>
            </select>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="address">Dirección *</label>
            <br />
            <input
              id="address"
              name="address"
              value={form.address}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="pricePerDayUSD">Precio/día (USD) *</label>
            <br />
            <input
              id="pricePerDayUSD"
              name="pricePerDayUSD"
              type="number"
              min="0.01"
              step="0.01"
              value={form.pricePerDayUSD}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="rooms">Habitaciones *</label>
            <br />
            <input
              id="rooms"
              name="rooms"
              type="number"
              min="1"
              value={form.rooms}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="maxGuests">Máx. huéspedes *</label>
            <br />
            <input
              id="maxGuests"
              name="maxGuests"
              type="number"
              min="1"
              value={form.maxGuests}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="cancellationPenaltyPercent">Penalidad cancelación (%)</label>
            <br />
            <input
              id="cancellationPenaltyPercent"
              name="cancellationPenaltyPercent"
              type="number"
              min="0"
              max="100"
              value={form.cancellationPenaltyPercent}
              onChange={handleFormChange}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="services">Servicios (separados por coma)</label>
            <br />
            <input
              id="services"
              name="services"
              value={servicesInput}
              onChange={(e) => setServicesInput(e.target.value)}
              placeholder="WiFi, Piscina, Estacionamiento"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Crear propiedad'}
          </button>
        </form>
      )}

      {filteredProperties.length === 0 ? (
        <p>{searchTerm ? 'No se encontraron propiedades.' : 'No hay propiedades registradas.'}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredProperties.map((p) => (
            <li
              key={p.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '1rem',
                marginBottom: '0.75rem',
              }}
            >
              <strong>{p.name}</strong> — {p.type === 'house' ? 'Casa' : 'Departamento'}
              <br />
              <span>{p.address}</span>
              <br />
              <span>
                USD {p.pricePerDayUSD}/día · {p.maxGuests} huéspedes máx.
              </span>
              {p.starRating !== null && <span> · ⭐ {p.starRating}</span>}
              {p.services.length > 0 && <div>Servicios: {p.services.join(', ')}</div>}
              <div style={{ marginTop: '0.5rem' }}>
                <Link to={`/properties/${p.id}`} style={{ marginRight: '0.5rem' }}>
                  Ver detalle
                </Link>
                <button
                  onClick={() => void handleDelete(p.id)}
                  style={{ color: 'red', cursor: 'pointer' }}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
