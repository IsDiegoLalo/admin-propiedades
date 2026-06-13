import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Rating from '@mui/material/Rating';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
      <Box>
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Volver
        </Button>
        <ErrorAlert message={error} />
      </Box>
    );
  }

  if (!property) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      {!editing ? (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
              {property.name}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={startEditing}
            >
              Editar
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => void handleDelete()}
            >
              Eliminar
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="body1" gutterBottom>
            <strong>Tipo:</strong> {property.type === 'house' ? 'Casa' : 'Departamento'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Dirección:</strong> {property.address}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Precio:</strong> USD {property.pricePerDayUSD}/día
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Máx. huéspedes:</strong> {property.maxGuests}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Penalidad de cancelación:</strong> {property.cancellationPenaltyPercent}%
          </Typography>

          {property.starRating !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body1">
                <strong>Calificación:</strong>
              </Typography>
              <Rating value={property.starRating} precision={0.5} readOnly size="small" />
              <Typography variant="body2" color="text.secondary">
                ({property.starRating})
              </Typography>
            </Box>
          )}

          {property.services.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Servicios
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {property.services.map((s) => (
                  <Chip key={s} label={s} color="secondary" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          {property.rooms.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Habitaciones
              </Typography>
              {property.rooms.map((r) => (
                <Paper key={r.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {r.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {r.type} · {r.beds} camas
                  </Typography>
                  <Typography variant="body2">{r.description}</Typography>
                </Paper>
              ))}
            </Box>
          )}

          {property.photos.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Fotos
              </Typography>
              <ImageList cols={3} rowHeight={160} gap={8}>
                {property.photos.map((ph) => (
                  <ImageListItem key={ph.photoId}>
                    <img
                      src={ph.url}
                      alt={ph.filename}
                      style={{ objectFit: 'cover', borderRadius: 8, height: '100%' }}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </Box>
          )}

          {Object.keys(property.extendedAttributes).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Atributos extendidos
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, backgroundColor: '#f8f9fa', overflowX: 'auto' }}
              >
                <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {JSON.stringify(property.extendedAttributes, null, 2)}
                </pre>
              </Paper>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              component={RouterLink}
              to={`/properties/${id}/bookings`}
            >
              Ver reservas
            </Button>
            <Button
              variant="outlined"
              component={RouterLink}
              to={`/properties/${id}/reviews`}
            >
              Ver reseñas
            </Button>
          </Box>
        </Paper>
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
    </Box>
  );
}
