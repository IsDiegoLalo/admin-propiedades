interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Cargando...' }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ padding: '1rem', fontFamily: 'sans-serif' }}
    >
      <span>{message}</span>
    </div>
  );
}
