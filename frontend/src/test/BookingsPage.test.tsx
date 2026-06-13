import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BookingsPage from '../pages/BookingsPage';
import type { BookingResponseDto } from '../types';

// Mock del servicio de reservaciones
vi.mock('../services/reservationsService', () => ({
  listBookingsByProperty: vi.fn(),
  createBooking: vi.fn(),
  cancelBooking: vi.fn(),
}));

import { listBookingsByProperty, createBooking } from '../services/reservationsService';

const mockListBookings = vi.mocked(listBookingsByProperty);
const mockCreateBooking = vi.mocked(createBooking);

const fakeBooking: BookingResponseDto = {
  id: 'booking-001',
  propertyId: 'prop-123',
  guestName: 'Juan Pérez',
  checkIn: '2024-03-01',
  checkOut: '2024-03-05',
  totalAmountUSD: 480,
  bookingType: 'refundable',
  cancellationPenaltyPercent: 10,
  bookingStatus: 'confirmed',
  paymentStatus: 'paid',
  createdAt: '2024-02-15T10:00:00Z',
  updatedAt: '2024-02-15T10:00:00Z',
};

function renderPage(propertyId = 'prop-123') {
  return render(
    <MemoryRouter initialEntries={[`/properties/${propertyId}/bookings`]}>
      <Routes>
        <Route path="/properties/:id/bookings" element={<BookingsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BookingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la lista de bookings correctamente', async () => {
    mockListBookings.mockResolvedValue([fakeBooking]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    expect(screen.getByText(/2024-03-01 → 2024-03-05/)).toBeInTheDocument();
    expect(screen.getByText(/USD 480/)).toBeInTheDocument();
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Pagado')).toBeInTheDocument();
  });

  it('valida que checkOut debe ser posterior a checkIn', async () => {
    mockListBookings.mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage();

    // Abrir formulario
    const newBtn = await screen.findByText('Nueva reserva');
    await user.click(newBtn);

    // Llenar campos
    const guestInput = screen.getByLabelText(/Nombre del huésped/);
    await user.type(guestInput, 'María García');

    const checkInInput = screen.getByLabelText(/Check-in/);
    await user.type(checkInInput, '2024-04-10');

    const checkOutInput = screen.getByLabelText(/Check-out/);
    await user.type(checkOutInput, '2024-04-05'); // Antes de checkIn

    const amountInput = screen.getByLabelText(/Monto total/);
    await user.clear(amountInput);
    await user.type(amountInput, '200');

    const submitBtn = screen.getByText('Crear reserva');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('La fecha de check-out debe ser posterior a check-in'),
      ).toBeInTheDocument();
    });

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it('muestra error cuando la creación de booking falla', async () => {
    mockListBookings.mockResolvedValue([]);
    mockCreateBooking.mockRejectedValue(new Error('Fechas solapadas con otra reserva'));
    const user = userEvent.setup();

    renderPage();

    // Abrir formulario
    const newBtn = await screen.findByText('Nueva reserva');
    await user.click(newBtn);

    // Llenar formulario con datos válidos
    const guestInput = screen.getByLabelText(/Nombre del huésped/);
    await user.type(guestInput, 'Carlos López');

    const checkInInput = screen.getByLabelText(/Check-in/);
    await user.type(checkInInput, '2024-05-01');

    const checkOutInput = screen.getByLabelText(/Check-out/);
    await user.type(checkOutInput, '2024-05-05');

    const amountInput = screen.getByLabelText(/Monto total/);
    await user.clear(amountInput);
    await user.type(amountInput, '300');

    const submitBtn = screen.getByText('Crear reserva');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Fechas solapadas con otra reserva'),
      ).toBeInTheDocument();
    });
  });

  it('muestra mensaje cuando no hay reservas', async () => {
    mockListBookings.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('No hay reservas para esta propiedad.'),
      ).toBeInTheDocument();
    });
  });

  it('muestra error amigable cuando la API de listado falla', async () => {
    mockListBookings.mockRejectedValue(new Error('Error de conexión con el servidor'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Error de conexión con el servidor',
    );
  });
});
