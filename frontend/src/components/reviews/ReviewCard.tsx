import type { ReviewResponseDto } from '../../types';

interface ReviewCardProps {
  review: ReviewResponseDto;
}

function renderStars(score: number): string {
  return '\u2605'.repeat(score) + '\u2606'.repeat(5 - score);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <li
      style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}
    >
      <strong>{review.guestName}</strong>
      <span
        style={{ marginLeft: '0.75rem', color: '#f5a623' }}
        aria-label={`${review.score} de 5 estrellas`}
      >
        {renderStars(review.score)}
      </span>
      <span style={{ marginLeft: '0.5rem', color: '#666', fontSize: '0.85rem' }}>
        ({review.score}/5)
      </span>
      <br />
      <span style={{ color: '#888', fontSize: '0.85rem' }}>{formatDate(review.createdAt)}</span>
      <p style={{ margin: '0.5rem 0 0' }}>{review.comment}</p>
    </li>
  );
}
