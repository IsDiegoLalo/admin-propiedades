import { useState } from 'react';
import { useProperties } from '../hooks/useProperties';
import { PropertyList } from '../components/properties/PropertyList';
import { PropertyForm } from '../components/properties/PropertyForm';
import { ErrorAlert } from '../components/common/ErrorAlert';
import type { CreatePropertyDto, UpdatePropertyDto } from '../types';

export default function PropertiesPage() {
  const {
    filteredProperties,
    error,
    searchTerm,
    setSearchTerm,
    handleCreateProperty,
    handleDeleteProperty,
  } = useProperties();

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmitProperty = async (
    data: CreatePropertyDto | UpdatePropertyDto,
    services: string,
  ) => {
    const payload: CreatePropertyDto = {
      ...(data as CreatePropertyDto),
      services: services
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setFormError(null);
    try {
      await handleCreateProperty(payload);
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear propiedad');
      throw err;
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('¿Confirmar eliminación de la propiedad?')) return;
    try {
      await handleDeleteProperty(id);
    } catch {
      // Error handled by hook
    }
  };

  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Propiedades</h1>

      {error && <ErrorAlert message={error} />}

      <PropertyList
        properties={filteredProperties}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onDelete={(id) => void onDelete(id)}
        onToggleForm={() => setShowForm(!showForm)}
        showForm={showForm}
      />

      {showForm && (
        <PropertyForm
          mode="create"
          onSubmit={onSubmitProperty}
          onCancel={() => setShowForm(false)}
          error={formError}
        />
      )}
    </main>
  );
}
