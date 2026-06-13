import { AxiosError } from 'axios';
import { reviewsApi } from '../config/api';
import type { ReviewResponseDto, CreateReviewDto, PropertyRatingDto } from '../types';

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as { error?: string };
    return data.error ?? 'Error desconocido';
  }
  return 'Error de conexión con el servidor';
}

export async function listReviews(propertyId: string): Promise<ReviewResponseDto[]> {
  try {
    const { data } = await reviewsApi.get<ReviewResponseDto[]>('/reviews', {
      params: { propertyId },
    });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function createReview(dto: CreateReviewDto): Promise<ReviewResponseDto> {
  try {
    const { data } = await reviewsApi.post<ReviewResponseDto>('/reviews', dto);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getPropertyRating(propertyId: string): Promise<PropertyRatingDto> {
  try {
    const { data } = await reviewsApi.get<PropertyRatingDto>(
      `/reviews/ratings/${propertyId}`,
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}
