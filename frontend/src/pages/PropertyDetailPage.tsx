import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProperty, updateProperty, deleteProperty } from '../services/propertiesService';
import type { PropertyResponseDto, UpdatePropertyDto } from '../types';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdatePropertyDto>({});
  const [servicesInput, setServicesInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProperty = async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await getProperty(id);
      setProperty(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la propiedad');
    }
  };

  useEffect(() => {
    void fetchProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startEditing = () => {
    if (!property) return;
    setForm({
      name: property.name,
      type: property.type,
      address: property.address,
      pricePerDayUSD: property.pricePerDayUSD,
      maxGuests: property.maxGuests,
      cancellationPenaltyPercent: property.cancellationPenaltyPercent,
      services: property.services,
    });
    setServicesInput(property.services.join(', '));
    setFormError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFormError(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const numericFields = ['pricePerDayUSD', 'maxGuests', 'cancellationPenaltyPercent'];
    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const validateForm = (): string | null => {
    if (form.name !== undefined && !form.name.trim()) return 'El nombre es obligatorio';
    if (form.address !== undefined && !form.address.trim()) return 'La dirección es obligatoria';
    if (form.pricePerDayUSD !== undefined && form.pricePerDayUSD <= 0)
      return 'El precio debe ser mayor a 0';
    if (form.maxGuests !== undefined && form.maxGuests < 1)
      return 'Debe admitir al menos 1 huésped';
    if (
      form.cancellationPenaltyPercent !== undefined &&
      (form.cancellationPenaltyPercent < 0 || form.cancellationPenaltyPercent > 100)
    ) {
      return 'La penalidad debe estar entre 0 y 100';
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const validationErr = validateForm();
    if (validationErr) {
      setFormError(validationErr);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const payload: UpdatePropertyDto = {
        ...form,
        services: servicesInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await updateProperty(id, payload);
      setEditing(false);
      await fetchProperty();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar propiedad');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('¿Confirmar eliminación de la propiedad?')) return;
    try {
      await deleteProperty(id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la propiedad');
    }
  };

  if (error) {
    return (
      <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
        <Link to="/">← Volver</Link>
        <div role="alert" style={{ color: 'red', marginTop: '1rem' }}>
          {error}
        </div>
      </main>
    );
  }

  if (!property) {
    return (
      <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>Cargando...</div>
    );
  }

  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <Link to="/">← Volver</Link>

      {!editing ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <h1 style={{ margin: 0 }}>{property.name}</h1>
            <button onClick={startEditing}>Editar</button>
            <button onClick={() => void handleDelete()} style={{ color: 'red' }}>
              Eliminar
            </button>
          </div>

          <p>
            <strong>Tipo:</strong> {property.type === 'house' ? 'Casa' : 'Departamento'}
          </p>
          <p>
            <strong>Dirección:</strong> {property.address}
          </p>
          <p>
            <strong>Precio:</strong> USD {property.pricePerDayUSD}/día
          </p>
          <p>
            <strong>Máx. huéspedes:</strong> {property.maxGuests}
          </p>
          <p>
            <strong>Penalidad de cancelación:</strong> {property.cancellationPenaltyPercent}%
          </p>
          {property.starRating !== null && (
            <p>
              <strong>Calificación:</strong> ⭐ {property.starRating}
            </p>
          )}

          {property.services.length > 0 && (
            <section>
              <h2>Servicios</h2>
              <ul>
                {property.services.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          )}

          {property.rooms.length > 0 && (
            <section>
              <h2>Habitaciones</h2>
              <ul>
                {property.rooms.map((r) => (
                  <li key={r.id}>
                    <strong>{r.name}</strong> — {r.type} · {r.beds} camas
                    <br />
                    {r.description}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {property.photos.length > 0 && (
            <section>
              <h2>Fotos</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {property.photos.map((ph) => (
                  <img
                    key={ph.photoId}
                    src={ph.url}
                    alt={ph.filename}
                    style={{
                      width: '150px',
                      height: '100px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {Object.keys(property.extendedAttributes).length > 0 && (
            <section>
              <h2>Atributos extendidos</h2>
              <pre
                style={{
                  background: '#f4f4f4',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  overflowX: 'auto',
                }}
              >
                {JSON.stringify(property.extendedAttributes, null, 2)}
              </pre>
            </section>
          )}

          <section style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <Link to={`/properties/${id}/bookings`}>Ver reservas</Link>
            <Link to={`/properties/${id}/reviews`}>Ver reseñas</Link>
          </section>
        </>
      ) : (
        <form
          onSubmit={(e) => void handleSave(e)}
          aria-label="Formulario de edición de propiedad"
          style={{
            border: '1px solid #ccc',
            padding: '1rem',
            marginTop: '1rem',
            borderRadius: '4px',
          }}
        >
          <h2>Editar propiedad</h2>
          {formError && (
            <div role="alert" style={{ color: 'red', marginBottom: '0.5rem' }}>
              {formError}
            </div>
          )}

          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="edit-name">Nombre *</label>
            <br />
            <input
              id="edit-name"
              name="name"
              value={form.name ?? ''}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="edit-type">Tipo *</label>
            <br />
            <select id="edit-type" name="type" value={form.type ?? 'apartment'} onChange={handleFormChange}>
              <option value="apartment">Departamento</option>
              <option value="house">Casa</option>
            </select>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="edit-address">Dirección *</label>
            <br />
            <input
              id="edit-address"
              name="address"
              value={form.address ?? ''}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="edit-pricePerDayUSD">Precio/día (USD) *</label>
            <br />
            <input
              id="edit-pricePerDayUSD"
              name="pricePerDayUSD"
              type="number"
              min="0.01"
              step="0.01"
              value={form.pricePerDayUSD ?? 0}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="edit-maxGuests">Máx. huéspedes *</label>
            <br />
            <input
              id="edit-maxGuests"
              name="maxGuests"
              type="number"
              min="1"
              value={form.maxGuests ?? 1}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="edit-cancellationPenaltyPercent">Penalidad cancelación (%)</label>
            <br />
            <input
              id="edit-cancellationPenaltyPercent"
              name="cancellationPenaltyPercent"
              type="number"
              min="0"
              max="100"
              value={form.cancellationPenaltyPercent ?? 0}
              onChange={handleFormChange}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="edit-services">Servicios (separados por coma)</label>
            <br />
            <input
              id="edit-services"
              name="services"
              value={servicesInput}
              onChange={(e) => setServicesInput(e.target.value)}
              placeholder="WiFi, Piscina, Estacionamiento"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={cancelEditing}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
