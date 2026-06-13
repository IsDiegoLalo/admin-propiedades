import type { PropertyResponseDto } from '../../types';
import { PropertyCard } from './PropertyCard';

interface PropertyListProps {
  properties: PropertyResponseDto[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDelete: (id: string) => void;
  onToggleForm: () => void;
  showForm: boolean;
}

export function PropertyList({
  properties,
  searchTerm,
  onSearchChange,
  onDelete,
  onToggleForm,
  showForm,
}: PropertyListProps) {
  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Buscar por nombre, dirección, tipo o servicio..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar propiedades"
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button onClick={onToggleForm}>
          {showForm ? 'Cancelar' : 'Nueva propiedad'}
        </button>
      </div>

      {properties.length === 0 ? (
        <p>{searchTerm ? 'No se encontraron propiedades.' : 'No hay propiedades registradas.'}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </>
  );
}
