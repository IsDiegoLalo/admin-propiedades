interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
      {message}
    </div>
  );
}
