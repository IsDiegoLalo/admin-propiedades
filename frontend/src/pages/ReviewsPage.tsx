import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReviews } from '../hooks/useReviews';
import { ReviewForm } from '../components/reviews/ReviewForm';
import { ReviewList } from '../components/reviews/ReviewList';
import { ErrorAlert } from '../components/common/ErrorAlert';

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
    <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <Link to={`/properties/${propertyId}`}>← Volver a propiedad</Link>
      <h1>Reseñas</h1>

      {error && <ErrorAlert message={error} />}

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: '1rem' }}>
        {showForm ? 'Cancelar' : 'Nueva reseña'}
      </button>

      {showForm && (
        <ReviewForm
          onSubmit={onSubmitReview}
          onCancel={() => setShowForm(false)}
          error={formError}
        />
      )}

      <ReviewList reviews={reviews} />
    </main>
  );
}
