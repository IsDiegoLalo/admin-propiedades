import type { BookingResponseDto } from '../../types';
import { BookingCard } from './BookingCard';

interface BookingListProps {
  bookings: BookingResponseDto[];
  onCancel: (id: string) => void;
}

export function BookingList({ bookings, onCancel }: BookingListProps) {
  if (bookings.length === 0) {
    return <p>No hay reservas para esta propiedad.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} onCancel={onCancel} />
      ))}
    </ul>
  );
}
