import { Link } from 'react-router-dom';
import type { PropertyResponseDto } from '../../types';

interface PropertyCardProps {
  property: PropertyResponseDto;
  onDelete: (id: string) => void;
}

export function PropertyCard({ property, onDelete }: PropertyCardProps) {
  return (
    <li
      style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}
    >
      <strong>{property.name}</strong> — {property.type === 'house' ? 'Casa' : 'Departamento'}
      <br />
      <span>{property.address}</span>
      <br />
      <span>
        USD {property.pricePerDayUSD}/día · {property.maxGuests} huéspedes máx.
      </span>
      {property.starRating !== null && <span> · ⭐ {property.starRating}</span>}
      {property.services.length > 0 && <div>Servicios: {property.services.join(', ')}</div>}
      <div style={{ marginTop: '0.5rem' }}>
        <Link to={`/properties/${property.id}`} style={{ marginRight: '0.5rem' }}>
          Ver detalle
        </Link>
        <button
          onClick={() => onDelete(property.id)}
          style={{ color: 'red', cursor: 'pointer' }}
          aria-label={`Eliminar propiedad ${property.name}`}
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}
