import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PropertiesPage from '../pages/PropertiesPage';
import type { PropertyResponseDto } from '../types';

// Mock del servicio de propiedades
vi.mock('../services/propertiesService', () => ({
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  deleteProperty: vi.fn(),
}));

import { listProperties, createProperty } from '../services/propertiesService';

const mockListProperties = vi.mocked(listProperties);
const mockCreateProperty = vi.mocked(createProperty);

const fakeProperty: PropertyResponseDto = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Casa de Playa',
  type: 'house',
  address: 'Av. Costanera 100',
  pricePerDayUSD: 120,
  currency: 'USD',
  maxGuests: 6,
  cancellationPenaltyPercent: 10,
  services: ['WiFi', 'Piscina'],
  rooms: [],
  photos: [],
  extendedAttributes: {},
  starRating: 4.5,
  deleted: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <PropertiesPage />
    </MemoryRouter>,
  );
}

describe('PropertiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la lista de propiedades correctamente', async () => {
    mockListProperties.mockResolvedValue([fakeProperty]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Casa de Playa')).toBeInTheDocument();
    });

    expect(screen.getByText('Av. Costanera 100')).toBeInTheDocument();
    expect(screen.getByText(/USD 120\/día/)).toBeInTheDocument();
    expect(screen.getByText(/Servicios: WiFi, Piscina/)).toBeInTheDocument();
  });

  it('muestra error amigable cuando la API falla', async () => {
    mockListProperties.mockRejectedValue(new Error('Error de conexión con el servidor'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Error de conexión con el servidor',
    );
  });

  it('valida que el nombre es obligatorio en el formulario de creación', async () => {
    mockListProperties.mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage();

    // Abrir formulario
    const newBtn = await screen.findByText('Nueva propiedad');
    await user.click(newBtn);

    // Llenar dirección y precio pero dejar nombre vacío
    const addressInput = screen.getByLabelText(/Dirección/);
    await user.type(addressInput, 'Calle Falsa 123');

    const priceInput = screen.getByLabelText(/Precio\/día/);
    await user.clear(priceInput);
    await user.type(priceInput, '50');

    // Usar fireEvent.submit para evadir la validación nativa del browser (required)
    const form = screen.getByRole('form', { name: /nueva propiedad/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    });

    // No se llama al servicio
    expect(mockCreateProperty).not.toHaveBeenCalled();
  });

  it('valida que la dirección es obligatoria', async () => {
    mockListProperties.mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage();

    const newBtn = await screen.findByText('Nueva propiedad');
    await user.click(newBtn);

    // Llenar nombre pero no dirección
    const nameInput = screen.getByLabelText(/Nombre/);
    await user.type(nameInput, 'Mi Propiedad');

    // Usar fireEvent.submit para evadir la validación nativa del browser (required)
    const form = screen.getByRole('form', { name: /nueva propiedad/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('La dirección es obligatoria')).toBeInTheDocument();
    });

    expect(mockCreateProperty).not.toHaveBeenCalled();
  });

  it('valida que el precio debe ser mayor a 0', async () => {
    mockListProperties.mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage();

    const newBtn = await screen.findByText('Nueva propiedad');
    await user.click(newBtn);

    const nameInput = screen.getByLabelText(/Nombre/);
    await user.type(nameInput, 'Propiedad Test');

    const addressInput = screen.getByLabelText(/Dirección/);
    await user.type(addressInput, 'Calle 1');

    // Precio queda en 0 por defecto - usar fireEvent.submit
    const form = screen.getByRole('form', { name: /nueva propiedad/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('El precio debe ser mayor a 0')).toBeInTheDocument();
    });

    expect(mockCreateProperty).not.toHaveBeenCalled();
  });
});
