import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Rating from '@mui/material/Rating';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { useReviews } from '../hooks/useReviews';
import { ErrorAlert } from '../components/common/ErrorAlert';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface ReviewFormData {
  guestName: string;
  score: number;
  comment: string;
}

export default function ReviewsPage() {
  const { id: propertyId } = useParams<{ id: string }>();
  const { reviews, error, handleCreateReview } = useReviews(propertyId);

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ReviewFormData>({
    guestName: '',
    score: 5,
    comment: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): string | null => {
    if (!form.guestName.trim()) return 'El nombre del huésped es obligatorio';
    if (form.score < 1 || form.score > 5) return 'El puntaje debe estar entre 1 y 5';
    if (!form.comment.trim()) return 'El comentario es obligatorio';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      await handleCreateReview({
        propertyId: propertyId ?? '',
        guestName: form.guestName.trim(),
        score: form.score,
        comment: form.comment.trim(),
      });
      setForm({ guestName: '', score: 5, comment: '' });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear reseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Button
        component={RouterLink}
        to={`/properties/${propertyId}`}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Volver a propiedad
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        Reseñas
      </Typography>

      {error && <ErrorAlert message={error} />}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setShowForm(!showForm)}
        sx={{ mb: 2 }}
      >
        {showForm ? 'Cancelar' : 'Nueva reseña'}
      </Button>

      {showForm && (
        <Paper sx={{ p: 3, maxWidth: 700, mb: 3 }}>
          <form onSubmit={(e) => void handleSubmit(e)} aria-label="Formulario de nueva reseña">
            <Typography variant="h6" gutterBottom>
              Nueva reseña
            </Typography>

            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Nombre del huésped"
              name="guestName"
              value={form.guestName}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />

            <Box sx={{ mb: 2 }}>
              <Typography component="legend" variant="body2" sx={{ mb: 0.5 }}>
                Puntaje *
              </Typography>
              <Rating
                name="score"
                value={form.score}
                onChange={(_event, newValue) => {
                  setForm((prev) => ({ ...prev, score: newValue ?? 1 }));
                }}
                size="large"
                aria-label="Puntaje de la reseña"
              />
            </Box>

            <TextField
              fullWidth
              label="Comentario"
              name="comment"
              value={form.comment}
              onChange={handleChange}
              required
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {loading ? 'Enviando...' : 'Publicar reseña'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowForm(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {reviews.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No hay reseñas para esta propiedad.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {reviews.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" component="span">
                    {r.guestName}
                  </Typography>
                  <Rating value={r.score} readOnly size="small" />
                  <Typography variant="body2" color="text.secondary">
                    ({r.score}/5)
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(r.createdAt)}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {r.comment}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
