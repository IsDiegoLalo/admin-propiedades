interface ConfirmDialogOptions {
  message: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Wrapper sobre window.confirm que ejecuta onConfirm si el usuario acepta.
 * Retorna true si se confirmó, false si se canceló.
 */
export function confirmAction({ message, onConfirm }: ConfirmDialogOptions): boolean {
  const confirmed = window.confirm(message);
  if (confirmed) {
    void onConfirm();
  }
  return confirmed;
}
