import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  listProperties,
  createProperty as createPropertyService,
  deleteProperty as deletePropertyService,
} from '../services/propertiesService';
import type { PropertyResponseDto, CreatePropertyDto } from '../types';

interface UsePropertiesReturn {
  properties: PropertyResponseDto[];
  filteredProperties: PropertyResponseDto[];
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchProperties: () => Promise<void>;
  handleCreateProperty: (payload: CreatePropertyDto) => Promise<void>;
  handleDeleteProperty: (id: string) => Promise<void>;
}

export function useProperties(): UsePropertiesReturn {
  const [properties, setProperties] = useState<PropertyResponseDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProperties = useCallback(async () => {
    try {
      setError(null);
      const data = await listProperties();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propiedades');
    }
  }, []);

  useEffect(() => {
    void fetchProperties();
  }, [fetchProperties]);

  const filteredProperties = useMemo(() => {
    if (!searchTerm.trim()) return properties;
    const term = searchTerm.toLowerCase();
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.address.toLowerCase().includes(term) ||
        p.type.toLowerCase().includes(term) ||
        p.services.some((s) => s.toLowerCase().includes(term)),
    );
  }, [properties, searchTerm]);

  const handleCreateProperty = useCallback(
    async (payload: CreatePropertyDto) => {
      await createPropertyService(payload);
      await fetchProperties();
    },
    [fetchProperties],
  );

  const handleDeleteProperty = useCallback(
    async (id: string) => {
      await deletePropertyService(id);
      await fetchProperties();
    },
    [fetchProperties],
  );

  return {
    properties,
    filteredProperties,
    error,
    searchTerm,
    setSearchTerm,
    fetchProperties,
    handleCreateProperty,
    handleDeleteProperty,
  };
}
