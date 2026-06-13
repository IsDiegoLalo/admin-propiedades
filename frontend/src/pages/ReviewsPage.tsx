import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Rating from '@mui/material/Rating';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { useReviews } from '../hooks/useReviews';
import { ReviewForm } from '../components/reviews/ReviewForm';
import { ErrorAlert } from '../components/common/ErrorAlert';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ReviewsPage() {
  const { id: propertyId } = useParams<{ id: string }>();
  const { reviews, error, handleCreateReview } = useReviews(propertyId);

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmitReview = async (data: {
    guestName: string;
    score: number;
    comment: string;
  }) => {
    setFormError(null);
    try {
      await handleCreateReview({
        propertyId: propertyId ?? '',
        guestName: data.guestName.trim(),
        score: data.score,
        comment: data.comment.trim(),
      });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear reseña');
      throw err;
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
        <ReviewForm
          onSubmit={onSubmitReview}
          onCancel={() => setShowForm(false)}
          error={formError}
        />
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
