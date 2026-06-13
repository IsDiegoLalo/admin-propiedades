export interface Property {
  id: string;
  name: string;
  type: 'house' | 'apartment';
  address: string;
  price_per_day_usd: number;
  currency: string;
  max_guests: number;
  cancellation_penalty_pct: number;
  services: string[];
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PropertyCurrencyRate {
  id: string;
  property_id: string;
  currency: string;
  rate: number;
  created_at: Date;
}

export interface CreatePropertyDto {
  name: string;
  type: 'house' | 'apartment';
  address: string;
  pricePerDayUSD: number;
  currency?: string;
  rooms: number;
  maxGuests: number;
  cancellationPenaltyPercent?: number;
  services?: string[];
  currencyRates?: Array<{ currency: string; rate: number }>;
  extendedAttributes?: Record<string, unknown>;
}

export interface UpdatePropertyDto {
  name?: string;
  type?: 'house' | 'apartment';
  address?: string;
  pricePerDayUSD?: number;
  currency?: string;
  maxGuests?: number;
  cancellationPenaltyPercent?: number;
  services?: string[];
  currencyRates?: Array<{ currency: string; rate: number }>;
  extendedAttributes?: Record<string, unknown>;
}

export interface PropertyResponseDto {
  id: string;
  name: string;
  type: 'house' | 'apartment';
  address: string;
  pricePerDayUSD: number;
  priceConverted?: number;
  currency: string;
  currencyFallback?: boolean;
  maxGuests: number;
  cancellationPenaltyPercent: number;
  services: string[];
  rooms: RoomDto[];
  photos: PhotoReferenceDto[];
  extendedAttributes: Record<string, unknown>;
  starRating: number | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomDto {
  id: string;
  propertyId: string;
  name: string;
  type: string;
  beds: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoReferenceDto {
  photoId: string;
  url: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}
