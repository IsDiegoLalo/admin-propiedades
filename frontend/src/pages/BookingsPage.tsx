import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { useBookings } from '../hooks/useBookings';
import { BookingForm } from '../components/bookings/BookingForm';
import { ErrorAlert } from '../components/common/ErrorAlert';
import type { BookingType, BookingResponseDto } from '../types';

function getStatusChipColor(status: string): 'success' | 'default' {
  return status === 'confirmed' ? 'success' : 'default';
}

function getPaymentChipColor(status: string): 'success' | 'warning' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
    paid: 'success',
    unpaid: 'warning',
    refunded: 'info',
    partial_refund: 'info',
  };
  return map[status] ?? 'default';
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
  };
  return labels[status] ?? status;
}

function formatPaymentStatus(status: string): string {
  const labels: Record<string, string> = {
    paid: 'Pagado',
    unpaid: 'No pagado',
    refunded: 'Reembolsado',
    partial_refund: 'Reembolso parcial',
  };
  return labels[status] ?? status;
}

export default function BookingsPage() {
  const { id: propertyId } = useParams<{ id: string }>();
  const { bookings, error, handleCreateBooking, handleCancelBooking } = useBookings(propertyId);

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingResponseDto | null>(null);

  const onSubmitBooking = async (data: {
    guestName: string;
    checkIn: string;
    checkOut: string;
    totalAmountUSD: number;
    bookingType: BookingType;
  }) => {
    if (!propertyId) return;
    setFormError(null);
    try {
      await handleCreateBooking({
        propertyId,
        guestName: data.guestName,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalAmountUSD: data.totalAmountUSD,
        bookingType: data.bookingType,
      });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear reserva');
      throw err;
    }
  };

  const confirmCancelBooking = async () => {
    if (!cancelTarget) return;
    try {
      await handleCancelBooking(cancelTarget.id);
    } catch {
      // Error handled by hook
    }
    setCancelTarget(null);
  };

  return (
    <Box>
      <Button
        component={RouterLink}
        to={`/properties/${propertyId}`}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Volver a propiedad
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        Reservas
      </Typography>

      {error && <ErrorAlert message={error} />}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setShowForm(!showForm)}
        sx={{ mb: 2 }}
      >
        {showForm ? 'Cancelar' : 'Nueva reserva'}
      </Button>

      {showForm && (
        <BookingForm
          onSubmit={onSubmitBooking}
          onCancel={() => setShowForm(false)}
          error={formError}
        />
      )}

      {bookings.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No hay reservas para esta propiedad.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {bookings.map((b) => (
            <Card key={b.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h6" component="span">
                    {b.guestName}
                  </Typography>
                  <Chip
                    label={formatStatus(b.bookingStatus)}
                    size="small"
                    color={getStatusChipColor(b.bookingStatus)}
                  />
                  <Chip
                    label={formatPaymentStatus(b.paymentStatus)}
                    size="small"
                    color={getPaymentChipColor(b.paymentStatus)}
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {b.checkIn} → {b.checkOut}
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  USD {b.totalAmountUSD}
                  {' · '}
                  {b.bookingType === 'refundable' ? 'Reembolsable' : 'No reembolsable'}
                </Typography>
                {b.cancelledAt && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Cancelada el: {new Date(b.cancelledAt).toLocaleDateString()}
                  </Typography>
                )}
                {b.bookingStatus === 'confirmed' && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => setCancelTarget(b)}
                    sx={{ mt: 1 }}
                    aria-label={`Cancelar reserva de ${b.guestName}`}
                  >
                    Cancelar reserva
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        aria-labelledby="cancel-dialog-title"
      >
        <DialogTitle id="cancel-dialog-title">Confirmar cancelación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas cancelar la reserva de{' '}
            <strong>{cancelTarget?.guestName}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>No, volver</Button>
          <Button
            onClick={() => void confirmCancelBooking()}
            color="error"
            variant="contained"
          >
            Sí, cancelar reserva
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
