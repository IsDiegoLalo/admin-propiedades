import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { createProperty, uploadPhoto } from '../services/propertiesService';
import type { CreatePropertyDto } from '../types';

interface PhotoPreview {
  file: File;
  previewUrl: string;
}

export default function NewPropertyPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CreatePropertyDto>({
    name: '',
    type: 'apartment',
    address: '',
    pricePerDayUSD: 0,
    currency: 'USD',
    rooms: 1,
    maxGuests: 1,
    cancellationPenaltyPercent: 0,
    services: [],
  });
  const [servicesInput, setServicesInput] = useState('');
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['pricePerDayUSD', 'rooms', 'maxGuests', 'cancellationPenaltyPercent'];
    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoPreview[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const validate = (): string | null => {
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
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload: CreatePropertyDto = {
        ...form,
        services: servicesInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const created = await createProperty(payload);

      for (const photo of photos) {
        await uploadPhoto(created.id, photo.file);
      }

      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));

      navigate(`/properties/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear propiedad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Nueva Propiedad
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 700 }}>
        <form onSubmit={(e) => void handleSubmit(e)} aria-label="Formulario de nueva propiedad">
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Nombre"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            select
            label="Tipo"
            name="type"
            value={form.type}
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
            value={form.address}
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
            value={form.pricePerDayUSD}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Habitaciones"
            name="rooms"
            type="number"
            inputProps={{ min: 1 }}
            value={form.rooms}
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
            value={form.maxGuests}
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
            value={form.cancellationPenaltyPercent}
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

          {/* Photo Upload */}
          <Typography variant="h6" gutterBottom>
            Fotos
          </Typography>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
            id="photo-upload-input"
          />
          <label htmlFor="photo-upload-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUploadIcon />}
              sx={{ mb: 2 }}
              aria-label="Subir fotos"
            >
              Seleccionar fotos
            </Button>
          </label>

          {photos.length > 0 && (
            <ImageList cols={3} rowHeight={120} sx={{ mb: 2 }}>
              {photos.map((photo, index) => (
                <ImageListItem key={photo.previewUrl} sx={{ position: 'relative' }}>
                  <img
                    src={photo.previewUrl}
                    alt={`Preview ${index + 1}`}
                    style={{ objectFit: 'cover', height: '100%', borderRadius: 4 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removePhoto(index)}
                    aria-label={`Eliminar foto ${index + 1}`}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ImageListItem>
              ))}
            </ImageList>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {loading ? 'Creando...' : 'Crear propiedad'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              Cancelar
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
