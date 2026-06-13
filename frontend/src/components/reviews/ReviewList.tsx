import type { ReviewResponseDto } from '../../types';
import { ReviewCard } from './ReviewCard';

interface ReviewListProps {
  reviews: ReviewResponseDto[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return <p>No hay reseñas para esta propiedad.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </ul>
  );
}
