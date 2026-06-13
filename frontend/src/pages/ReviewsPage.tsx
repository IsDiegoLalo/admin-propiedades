import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listReviews, createReview } from '../services/reviewsService';
import type { ReviewResponseDto, CreateReviewDto } from '../types';

export default function ReviewsPage() {
  const { id: propertyId } = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<ReviewResponseDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<Omit<CreateReviewDto, 'propertyId'>>({
    guestName: '',
    score: 5,
    comment: '',
  });

  const fetchReviews = async () => {
    if (!propertyId) return;
    try {
      const data = await listReviews(propertyId);
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar reseñas');
    }
  };

  useEffect(() => { void fetchReviews(); }, [propertyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'score' ? Number(value) : value,
    }));
  };

  const validateForm = (): string | null => {
    if (!form.guestName.trim()) return 'El nombre del huésped es obligatorio';
    const score = Number(form.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) return 'El puntaje debe ser un entero entre 1 y 5';
    if (!form.comment.trim()) return 'El comentario es obligatorio';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) { setFormError(validationErr); return; }
    setFormError(null);
    setLoading(true);
    try {
      await createReview({
        propertyId: propertyId ?? '',
        guestName: form.guestName.trim(),
        score: Number(form.score),
        comment: form.comment.trim(),
      });
      setShowForm(false);
      setForm({ guestName: '', score: 5, comment: '' });
      await fetchReviews();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear reseña');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (score: number): string => {
    return '★'.repeat(score) + '☆'.repeat(5 - score);
  };

  const formatDate = (iso: string): string => {
    return new Date(iso).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <Link to={`/properties/${propertyId}`}>← Volver a propiedad</Link>
      <h1>Reseñas</h1>

      {error && <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: '1rem' }}>
        {showForm ? 'Cancelar' : 'Nueva reseña'}
      </button>

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} aria-label="Formulario de nueva reseña" style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <h2>Nueva reseña</h2>
          {formError && <div role="alert" style={{ color: 'red' }}>{formError}</div>}

          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="guestName">Nombre del huésped *</label><br />
            <input id="guestName" name="guestName" value={form.guestName} onChange={handleChange} required />
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
            <textarea id="comment" name="comment" value={form.comment} onChange={handleChange} rows={3} style={{ width: '100%' }} required />
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Enviando...' : 'Publicar reseña'}
          </button>
        </form>
      )}

      {reviews.length === 0 ? <p>No hay reseñas para esta propiedad.</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {reviews.map((r) => (
            <li key={r.id} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '1rem', marginBottom: '0.75rem' }}>
              <strong>{r.guestName}</strong>
              <span style={{ marginLeft: '0.75rem', color: '#f5a623' }} aria-label={`${r.score} de 5 estrellas`}>
                {renderStars(r.score)}
              </span>
              <span style={{ marginLeft: '0.5rem', color: '#666', fontSize: '0.85rem' }}>
                ({r.score}/5)
              </span>
              <br />
              <span style={{ color: '#888', fontSize: '0.85rem' }}>{formatDate(r.createdAt)}</span>
              <p style={{ margin: '0.5rem 0 0' }}>{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
