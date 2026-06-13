import { useEffect, useState, useCallback } from 'react';
import {
  listReviews,
  createReview as createReviewService,
} from '../services/reviewsService';
import type { ReviewResponseDto, CreateReviewDto } from '../types';

interface UseReviewsReturn {
  reviews: ReviewResponseDto[];
  error: string | null;
  fetchReviews: () => Promise<void>;
  handleCreateReview: (dto: CreateReviewDto) => Promise<void>;
}

export function useReviews(propertyId: string | undefined): UseReviewsReturn {
  const [reviews, setReviews] = useState<ReviewResponseDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!propertyId) return;
    try {
      setError(null);
      const data = await listReviews(propertyId);
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar reseñas');
    }
  }, [propertyId]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const handleCreateReview = useCallback(
    async (dto: CreateReviewDto) => {
      await createReviewService(dto);
      await fetchReviews();
    },
    [fetchReviews],
  );

  return {
    reviews,
    error,
    fetchReviews,
    handleCreateReview,
  };
}
