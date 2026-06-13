import { useState } from 'react';
import { ErrorAlert } from '../common/ErrorAlert';

interface ReviewFormData {
  guestName: string;
  score: number;
  comment: string;
}

interface ReviewFormProps {
  onSubmit: (data: ReviewFormData) => Promise<void>;
  onCancel: () => void;
  error: string | null;
}

const initialForm: ReviewFormData = {
  guestName: '',
  score: 5,
  comment: '',
};

export function ReviewForm({ onSubmit, onCancel, error }: ReviewFormProps) {
  const [form, setForm] = useState<ReviewFormData>(initialForm);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'score' ? Number(value) : value,
    }));
  };

  const validateForm = (): string | null => {
    if (!form.guestName.trim()) return 'El nombre del huésped es obligatorio';
    const score = Number(form.score);
    if (!Number.isInteger(score) || score < 1 || score > 5)
      return 'El puntaje debe ser un entero entre 1 y 5';
    if (!form.comment.trim()) return 'El comentario es obligatorio';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setValidationError(validationErr);
      return;
    }
    setValidationError(null);
    setLoading(true);
    try {
      await onSubmit(form);
      setForm(initialForm);
    } catch {
      // Error handled by parent via error prop
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      aria-label="Formulario de nueva reseña"
      style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}
    >
      <h2>Nueva reseña</h2>
      {(validationError || error) && (
        <ErrorAlert message={validationError ?? error ?? ''} />
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="guestName">Nombre del huésped *</label><br />
        <input
          id="guestName"
          name="guestName"
          value={form.guestName}
          onChange={handleChange}
          required
        />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="score">Puntaje (1-5) *</label><br />
        <select id="score" name="score" value={form.score} onChange={handleChange} required>
          <option value={1}>1 ★</option>
          <option value={2}>2 ★★</option>
          <option value={3}>3 ★★★</option>
          <option value={4}>4 ★★★★</option>
          <option value={5}>5 ★★★★★</option>
        </select>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="comment">Comentario *</label><br />
        <textarea
          id="comment"
          name="comment"
          value={form.comment}
          onChange={handleChange}
          rows={3}
          style={{ width: '100%' }}
          required
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Publicar reseña'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
