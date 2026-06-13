import { REVIEWS_SERVICE_URL } from '../config/env';

interface PropertyRatingDto {
  propertyId: string;
  starRating: number | null;
  reviewCount: number;
}

export async function getRating(propertyId: string): Promise<number | null> {
  try {
    const response = await fetch(`${REVIEWS_SERVICE_URL}/reviews/ratings/${propertyId}`);
    if (!response.ok) return null;
    const data = (await response.json()) as PropertyRatingDto;
    return data.starRating;
  } catch {
    // El servicio de reseñas no está disponible: devolvemos null sin romper el flujo
    return null;
  }
}
