export interface Review {
  id: string;
  property_id: string;
  guest_name: string;
  score: number;
  comment: string;
  created_at: Date;
}

export interface PropertyRating {
  property_id: string;
  star_rating: number | null;
  review_count: number;
  updated_at: Date;
}

export interface CreateReviewDto {
  propertyId: string;
  guestName: string;
  score: number;
  comment: string;
}

export interface PropertyRatingDto {
  propertyId: string;
  starRating: number | null;
  reviewCount: number;
}
