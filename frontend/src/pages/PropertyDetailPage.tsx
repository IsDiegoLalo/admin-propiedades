import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProperty, updateProperty, deleteProperty } from '../services/propertiesService';
import { PropertyForm } from '../components/properties/PropertyForm';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { PropertyResponseDto, CreatePropertyDto, UpdatePropertyDto } from '../types';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);
    setEditing(true);
  };

  const handleSave = async (
    data: CreatePropertyDto | UpdatePropertyDto,
    services: string,
  ) => {
    if (!id) return;
    setFormError(null);
    try {
      const payload: UpdatePropertyDto = {
        ...(data as UpdatePropertyDto),
        services: services
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await updateProperty(id, payload);
      setEditing(false);
      await fetchProperty();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar propiedad');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('¿Confirmar eliminación de la propiedad?')) return;
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
        <ErrorAlert message={error} />
      </main>
    );
  }

  if (!property) {
    return <LoadingSpinner />;
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
        <PropertyForm
          mode="edit"
          initialData={{
            name: property.name,
            type: property.type,
            address: property.address,
            pricePerDayUSD: property.pricePerDayUSD,
            maxGuests: property.maxGuests,
            cancellationPenaltyPercent: property.cancellationPenaltyPercent,
            services: property.services,
          }}
          initialServices={property.services.join(', ')}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
          error={formError}
        />
      )}
    </main>
  );
}
