import { db } from '../db/postgres';
import type { Review, PropertyRating, PropertyRatingDto } from '../models/review';
import type { CreateReviewInput } from '../validators/reviewValidator';

// Calcula la media aritmética redondeada a 1 decimal
function calcStarRating(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const rows = await db<Review>('reviews')
    .insert({
      property_id: input.propertyId,
      guest_name: input.guestName,
      score: input.score,
      comment: input.comment,
    })
    .returning('*');

  const review = rows[0];
  if (!review) {
    throw new Error('Failed to insert review');
  }

  // Recalcular y persistir el star rating
  const scoreRows = await db<Review>('reviews')
    .where({ property_id: input.propertyId })
    .select('score');

  const scores = scoreRows.map((r) => Number(r.score));
  const starRating = calcStarRating(scores);

  await db<PropertyRating>('property_ratings')
    .insert({
      property_id: input.propertyId,
      star_rating: starRating,
      review_count: scores.length,
      updated_at: new Date(),
    })
    .onConflict('property_id')
    .merge(['star_rating', 'review_count', 'updated_at']);

  return review;
}

export async function listReviews(propertyId: string): Promise<Review[]> {
  return db<Review>('reviews')
    .where({ property_id: propertyId })
    .orderBy('created_at', 'desc');
}

export async function getRating(propertyId: string): Promise<PropertyRatingDto> {
  const row = await db<PropertyRating>('property_ratings')
    .where({ property_id: propertyId })
    .first();

  return {
    propertyId,
    starRating: row?.star_rating ?? null,
    reviewCount: row?.review_count ?? 0,
  };
}
