import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Rating from '@mui/material/Rating';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import {
  getProperty,
  updateProperty,
  deleteProperty,
  uploadPhoto,
  deletePhoto,
} from '../services/propertiesService';
import { propertiesApi } from '../config/api';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import placeholderImg from '../assets/images/property_placeholder.png';
import type {
  PropertyResponseDto,
  UpdatePropertyDto,
} from '../types';

const PHOTOS_VISIBLE = 5;
const PHOTO_THUMB_SIZE = 120;

/** Construye la URL completa de una foto a partir de la URL relativa del backend */
function buildPhotoUrl(relativeUrl: string): string {
  const base = propertiesApi.defaults.baseURL ?? '';
  return `${base}${relativeUrl}`;
}

interface PhotoPreview {
  file: File;
  previewUrl: string;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [property, setProperty] = useState<PropertyResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Photo carousel state
  const [photoOffset, setPhotoOffset] = useState(0);

  // Edit form state
  const [form, setForm] = useState<UpdatePropertyDto>({});
  const [servicesInput, setServicesInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Photo edit state
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<PhotoPreview[]>([]);

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
    setFormError(null);
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
    setPhotosToDelete([]);
    setNewPhotos([]);
    setEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['pricePerDayUSD', 'maxGuests', 'cancellationPenaltyPercent'];
    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const previews: PhotoPreview[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewPhotos((prev) => [...prev, ...previews]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const markPhotoForDeletion = (photoId: string) => {
    setPhotosToDelete((prev) => [...prev, photoId]);
  };

  const unmarkPhotoForDeletion = (photoId: string) => {
    setPhotosToDelete((prev) => prev.filter((pId) => pId !== photoId));
  };

  const validate = (): string | null => {
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

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
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

      // Eliminar fotos marcadas
      for (const photoId of photosToDelete) {
        await deletePhoto(id, photoId);
      }

      // Subir fotos nuevas
      for (const photo of newPhotos) {
        await uploadPhoto(id, photo.file);
      }

      newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
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
    if (!window.confirm('¿Confirmar eliminación de la propiedad?')) return;
    try {
      await deleteProperty(id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la propiedad');
    }
  };

  // Photo carousel navigation
  const photos = property?.photos ?? [];
  const canScrollLeft = photoOffset > 0;
  const canScrollRight = photoOffset + PHOTOS_VISIBLE < photos.length;

  const scrollLeft = () => setPhotoOffset((prev) => Math.max(0, prev - 1));
  const scrollRight = () =>
    setPhotoOffset((prev) => Math.min(photos.length - PHOTOS_VISIBLE, prev + 1));

  if (error) {
    return (
      <Box>
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Volver
        </Button>
        <ErrorAlert message={error} />
      </Box>
    );
  }

  if (!property) {
    return <LoadingSpinner />;
  }

  if (editing) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => setEditing(false)}
          sx={{ mb: 2 }}
        >
          Cancelar edición
        </Button>

        <Typography variant="h4" component="h1" gutterBottom>
          Editar Propiedad
        </Typography>

        <Paper sx={{ p: 3, maxWidth: 700 }}>
          <form onSubmit={(e) => void handleSave(e)} aria-label="Formulario de edición de propiedad">
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Nombre"
              name="name"
              value={form.name ?? ''}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              select
              label="Tipo"
              name="type"
              value={form.type ?? 'apartment'}
              onChange={handleChange}
              sx={{ mb: 2 }}
            >
              <MenuItem value="apartment">Departamento</MenuItem>
              <MenuItem value="house">Casa</MenuItem>
            </TextField>

            <TextField
              fullWidth
              label="Dirección"
              name="address"
              value={form.address ?? ''}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Precio/día (USD)"
              name="pricePerDayUSD"
              type="number"
              inputProps={{ min: 0.01, step: 0.01 }}
              value={form.pricePerDayUSD ?? 0}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Máx. huéspedes"
              name="maxGuests"
              type="number"
              inputProps={{ min: 1 }}
              value={form.maxGuests ?? 1}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Penalidad cancelación (%)"
              name="cancellationPenaltyPercent"
              type="number"
              inputProps={{ min: 0, max: 100 }}
              value={form.cancellationPenaltyPercent ?? 0}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Servicios (separados por coma)"
              name="services"
              value={servicesInput}
              onChange={(e) => setServicesInput(e.target.value)}
              placeholder="WiFi, Piscina, Estacionamiento"
              sx={{ mb: 3 }}
            />

            {/* Fotos existentes */}
            <Typography variant="h6" gutterBottom>
              Fotos
            </Typography>

            {property.photos.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {property.photos.map((photo) => {
                  const isMarkedForDeletion = photosToDelete.includes(photo.photoId);
                  return (
                    <Box
                      key={photo.photoId}
                      sx={{
                        position: 'relative',
                        width: PHOTO_THUMB_SIZE,
                        height: PHOTO_THUMB_SIZE,
                        opacity: isMarkedForDeletion ? 0.4 : 1,
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={buildPhotoUrl(photo.url)}
                        alt={photo.filename}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          isMarkedForDeletion
                            ? unmarkPhotoForDeletion(photo.photoId)
                            : markPhotoForDeletion(photo.photoId)
                        }
                        aria-label={
                          isMarkedForDeletion
                            ? `Restaurar foto ${photo.filename}`
                            : `Eliminar foto ${photo.filename}`
                        }
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: isMarkedForDeletion
                            ? 'rgba(76,175,80,0.8)'
                            : 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          '&:hover': {
                            backgroundColor: isMarkedForDeletion
                              ? 'rgba(76,175,80,1)'
                              : 'rgba(0,0,0,0.8)',
                          },
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Nuevas fotos a subir */}
            {newPhotos.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {newPhotos.map((photo, index) => (
                  <Box
                    key={photo.previewUrl}
                    sx={{
                      position: 'relative',
                      width: PHOTO_THUMB_SIZE,
                      height: PHOTO_THUMB_SIZE,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '2px solid',
                      borderColor: 'primary.main',
                    }}
                  >
                    <img
                      src={photo.previewUrl}
                      alt={`Nueva foto ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeNewPhoto(index)}
                      aria-label={`Eliminar nueva foto ${index + 1}`}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
              id="edit-photo-upload-input"
            />
            <label htmlFor="edit-photo-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                sx={{ mb: 3 }}
                aria-label="Subir fotos"
              >
                Agregar fotos
              </Button>
            </label>

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    );
  }

  // Vista de detalle (no editando)
  return (
    <Box>
      <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Volver
      </Button>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            {property.name}
          </Typography>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={startEditing}>
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

        {/* Layout dos columnas: datos + fotos */}
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* Columna izquierda: datos */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
          </Box>

          {/* Columna derecha: fotos */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" gutterBottom>
              Fotos
            </Typography>
            {photos.length === 0 ? (
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <img
                  src={placeholderImg}
                  alt="Sin fotos disponibles"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  onClick={scrollLeft}
                  disabled={!canScrollLeft}
                  aria-label="Foto anterior"
                  size="small"
                >
                  <ChevronLeftIcon />
                </IconButton>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    overflow: 'hidden',
                    flex: 1,
                  }}
                >
                  {photos
                    .slice(photoOffset, photoOffset + PHOTOS_VISIBLE)
                    .map((photo) => (
                      <Box
                        key={photo.photoId}
                        sx={{
                          width: PHOTO_THUMB_SIZE,
                          height: PHOTO_THUMB_SIZE,
                          flexShrink: 0,
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={buildPhotoUrl(photo.url)}
                          alt={photo.filename}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                    ))}
                </Box>

                <IconButton
                  onClick={scrollRight}
                  disabled={!canScrollRight}
                  aria-label="Foto siguiente"
                  size="small"
                >
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </Box>

        {/* Habitaciones */}
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

        {/* Atributos extendidos */}
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
    </Box>
  );
}
