import { db } from '../db/postgres';
import { PropertyDocumentModel } from '../models/propertyDoc';
import { NotFoundError } from '../middleware/errors';
import { getRating } from './reviewsClient';
import type {
  Property,
  PropertyCurrencyRate,
  PropertyResponseDto,
  RoomDto,
  PhotoReferenceDto,
} from '../models/property';
import type { CreatePropertyInput, UpdatePropertyInput } from '../validators/propertyValidator';
import { Room } from '../models/room';

// ── Helpers ────────────────────────────────────────────────────────────────────

function toResponseDto(
  property: Property,
  rooms: Room[],
  photos: PhotoReferenceDto[],
  extendedAttributes: Record<string, unknown>,
  starRating: number | null,
  priceConverted?: number,
  currencyFallback?: boolean,
): PropertyResponseDto {
  const dto: PropertyResponseDto = {
    id: property.id,
    name: property.name,
    type: property.type,
    address: property.address,
    pricePerDayUSD: Number(property.price_per_day_usd),
    currency: property.currency,
    maxGuests: property.max_guests,
    cancellationPenaltyPercent: Number(property.cancellation_penalty_pct),
    services: property.services ?? [],
    rooms: rooms.map(toRoomDto),
    photos,
    extendedAttributes,
    starRating,
    deleted: property.deleted,
    createdAt: property.created_at.toISOString(),
    updatedAt: property.updated_at.toISOString(),
  };

  if (priceConverted !== undefined) dto.priceConverted = priceConverted;
  if (currencyFallback !== undefined) dto.currencyFallback = currencyFallback;

  return dto;
}

function toRoomDto(room: Room): RoomDto {
  return {
    id: room.id,
    propertyId: room.property_id,
    name: room.name,
    type: room.type,
    beds: room.beds,
    description: room.description,
    active: room.active,
    createdAt: room.created_at.toISOString(),
    updatedAt: room.updated_at.toISOString(),
  };
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function createProperty(input: CreatePropertyInput): Promise<PropertyResponseDto> {
  const [property] = await db('properties')
    .insert({
      name: input.name,
      type: input.type,
      address: input.address,
      price_per_day_usd: input.pricePerDayUSD,
      currency: input.currency,
      max_guests: input.maxGuests,
      cancellation_penalty_pct: input.cancellationPenaltyPercent,
      services: input.services,
    })
    .returning('*') as Property[];

  // Tasas de cambio opcionales
  if (input.currencyRates && input.currencyRates.length > 0) {
    await db('property_currency_rates').insert(
      input.currencyRates.map((cr) => ({
        property_id: property.id,
        currency: cr.currency,
        rate: cr.rate,
      })),
    );
  }

  // Documento MongoDB con atributos extendidos
  await PropertyDocumentModel.create({
    propertyId: property.id,
    extendedAttributes: input.extendedAttributes ?? {},
    photos: [],
  });

  const rooms = await db<Room>('rooms').where({ property_id: property.id, active: true });

  return toResponseDto(property, rooms, [], input.extendedAttributes ?? {}, null);
}

export async function getPropertyById(
  id: string,
  currency?: string,
): Promise<PropertyResponseDto> {
  const property = await db<Property>('properties').where({ id }).first();
  if (!property) throw new NotFoundError(`Propiedad con id ${id} no encontrada`);

  const rooms = await db<Room>('rooms').where({ property_id: id, active: true });

  const doc = await PropertyDocumentModel.findOne({ propertyId: id }).lean();
  const extendedAttributes = (doc?.extendedAttributes ?? {}) as Record<string, unknown>;
  const photos: PhotoReferenceDto[] = (doc?.photos ?? []).map((p) => ({
    ...p,
    uploadedAt: p.uploadedAt.toISOString(),
  }));

  const starRating = await getRating(id);

  // Conversión de moneda
  let priceConverted: number | undefined;
  let currencyFallback: boolean | undefined;

  if (currency && currency !== property.currency) {
    const rateRow = await db<PropertyCurrencyRate>('property_currency_rates')
      .where({ property_id: id, currency })
      .first();

    if (rateRow) {
      priceConverted = Math.round(Number(property.price_per_day_usd) * Number(rateRow.rate) * 100) / 100;
    } else {
      currencyFallback = true;
    }
  }

  return toResponseDto(property, rooms, photos, extendedAttributes, starRating, priceConverted, currencyFallback);
}

export async function listProperties(): Promise<PropertyResponseDto[]> {
  const properties = await db<Property>('properties').where({ deleted: false });

  const results = await Promise.all(
    properties.map(async (p) => {
      const rooms = await db<Room>('rooms').where({ property_id: p.id, active: true });
      const doc = await PropertyDocumentModel.findOne({ propertyId: p.id }).lean();
      const extendedAttributes = (doc?.extendedAttributes ?? {}) as Record<string, unknown>;
      const photos: PhotoReferenceDto[] = (doc?.photos ?? []).map((ph) => ({
        ...ph,
        uploadedAt: ph.uploadedAt.toISOString(),
      }));
      const starRating = await getRating(p.id);
      return toResponseDto(p, rooms, photos, extendedAttributes, starRating);
    }),
  );

  return results;
}

export async function updateProperty(
  id: string,
  input: UpdatePropertyInput,
): Promise<PropertyResponseDto> {
  const existing = await db<Property>('properties').where({ id }).first();
  if (!existing) throw new NotFoundError(`Propiedad con id ${id} no encontrada`);

  const updates: Partial<Record<string, unknown>> = { updated_at: new Date() };
  if (input.name !== undefined) updates['name'] = input.name;
  if (input.type !== undefined) updates['type'] = input.type;
  if (input.address !== undefined) updates['address'] = input.address;
  if (input.pricePerDayUSD !== undefined) updates['price_per_day_usd'] = input.pricePerDayUSD;
  if (input.currency !== undefined) updates['currency'] = input.currency;
  if (input.maxGuests !== undefined) updates['max_guests'] = input.maxGuests;
  if (input.cancellationPenaltyPercent !== undefined) updates['cancellation_penalty_pct'] = input.cancellationPenaltyPercent;
  if (input.services !== undefined) updates['services'] = input.services;

  await db('properties').where({ id }).update(updates);

  // Actualizar tasas de cambio si se proveen
  if (input.currencyRates !== undefined) {
    await db('property_currency_rates').where({ property_id: id }).delete();
    if (input.currencyRates.length > 0) {
      await db('property_currency_rates').insert(
        input.currencyRates.map((cr) => ({
          property_id: id,
          currency: cr.currency,
          rate: cr.rate,
        })),
      );
    }
  }

  // Actualizar atributos extendidos si se proveen
  if (input.extendedAttributes !== undefined) {
    await PropertyDocumentModel.findOneAndUpdate(
      { propertyId: id },
      { extendedAttributes: input.extendedAttributes },
      { upsert: true },
    );
  }

  return getPropertyById(id);
}

export async function softDeleteProperty(id: string): Promise<void> {
  const existing = await db<Property>('properties').where({ id }).first();
  if (!existing) throw new NotFoundError(`Propiedad con id ${id} no encontrada`);

  await db('properties').where({ id }).update({ deleted: true, updated_at: new Date() });
}
