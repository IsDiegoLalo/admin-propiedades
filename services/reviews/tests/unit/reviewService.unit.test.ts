/**
 * Unit tests para reviewService.ts
 * Validates: Requirements 16.3
 *
 * Tests que verifican:
 * - createReview persiste y recalcula el rating
 * - listReviews ordena por createdAt desc
 * - getRating retorna null sin reseñas
 */

// --- Mocks de Knex (sin tipado estricto para evitar conflictos con el query builder) ---
let dbCalls: Array<{ table: string; method: string; args: unknown[] }> = [];
let mockResults: Record<string, unknown> = {};

jest.mock('../../src/db/postgres', () => ({
  __esModule: true,
  db: new Proxy(() => {}, {
    apply(_target, _thisArg, args: unknown[]) {
      const table = args[0] as string;

      // Retornar un query builder encadenado que registra llamadas
      const builder: Record<string, unknown> = {};

      builder.insert = (...iArgs: unknown[]) => {
        dbCalls.push({ table, method: 'insert', args: iArgs });
        return {
          returning: (...rArgs: unknown[]) => {
            dbCalls.push({ table, method: 'returning', args: rArgs });
            return Promise.resolve(mockResults[`${table}.insert.returning`]);
          },
          onConflict: (...cArgs: unknown[]) => {
            dbCalls.push({ table, method: 'onConflict', args: cArgs });
            return {
              merge: (...mArgs: unknown[]) => {
                dbCalls.push({ table, method: 'merge', args: mArgs });
                return Promise.resolve(mockResults[`${table}.insert.onConflict.merge`]);
              },
            };
          },
        };
      };

      builder.where = (...wArgs: unknown[]) => {
        dbCalls.push({ table, method: 'where', args: wArgs });
        return {
          select: (...sArgs: unknown[]) => {
            dbCalls.push({ table, method: 'select', args: sArgs });
            return Promise.resolve(mockResults[`${table}.where.select`]);
          },
          orderBy: (...oArgs: unknown[]) => {
            dbCalls.push({ table, method: 'orderBy', args: oArgs });
            return Promise.resolve(mockResults[`${table}.where.orderBy`]);
          },
          first: () => {
            dbCalls.push({ table, method: 'first', args: [] });
            return Promise.resolve(mockResults[`${table}.where.first`]);
          },
        };
      };

      return builder;
    },
  }),
}));

import { createReview, listReviews, getRating } from '../../src/services/reviewService';

describe('reviewService — createReview', () => {
  beforeEach(() => {
    dbCalls = [];
    mockResults = {};
  });

  it('persiste la reseña y recalcula el rating correctamente', async () => {
    const input = {
      propertyId: '550e8400-e29b-41d4-a716-446655440000',
      guestName: 'Juan Pérez',
      score: 4,
      comment: 'Muy buena propiedad',
    };

    const insertedReview = {
      id: 'review-uuid-1',
      property_id: input.propertyId,
      guest_name: input.guestName,
      score: input.score,
      comment: input.comment,
      created_at: new Date('2024-06-15'),
    };

    // Configurar respuestas mock
    mockResults['reviews.insert.returning'] = [insertedReview];
    mockResults['reviews.where.select'] = [{ score: 5 }, { score: 3 }, { score: 4 }];
    mockResults['property_ratings.insert.onConflict.merge'] = undefined;

    const result = await createReview(input);

    // Verificar que retorna el review insertado
    expect(result).toEqual(insertedReview);

    // Verificar que se insertó con los campos correctos
    const insertCall = dbCalls.find((c) => c.table === 'reviews' && c.method === 'insert');
    expect(insertCall).toBeDefined();
    expect(insertCall!.args[0]).toEqual({
      property_id: input.propertyId,
      guest_name: input.guestName,
      score: input.score,
      comment: input.comment,
    });

    // Verificar que se consultaron los scores para recalcular el rating
    const whereCall = dbCalls.find((c) => c.table === 'reviews' && c.method === 'where');
    expect(whereCall).toBeDefined();
    expect(whereCall!.args[0]).toEqual({ property_id: input.propertyId });

    // Verificar que se persistió en property_ratings
    const ratingInsert = dbCalls.find(
      (c) => c.table === 'property_ratings' && c.method === 'insert',
    );
    expect(ratingInsert).toBeDefined();

    // Verificar que el star_rating calculado es correcto (media de [5,3,4] = 4.0)
    const ratingData = ratingInsert!.args[0] as Record<string, unknown>;
    expect(ratingData.property_id).toBe(input.propertyId);
    expect(ratingData.star_rating).toBe(4);
    expect(ratingData.review_count).toBe(3);

    // Verificar onConflict para upsert
    const onConflictCall = dbCalls.find(
      (c) => c.table === 'property_ratings' && c.method === 'onConflict',
    );
    expect(onConflictCall).toBeDefined();
    expect(onConflictCall!.args[0]).toBe('property_id');
  });

  it('lanza error si insert no retorna filas', async () => {
    const input = {
      propertyId: '550e8400-e29b-41d4-a716-446655440000',
      guestName: 'Test User',
      score: 3,
      comment: 'Comentario de prueba',
    };

    mockResults['reviews.insert.returning'] = [];

    await expect(createReview(input)).rejects.toThrow('Failed to insert review');
  });

  it('calcula starRating con precisión de 1 decimal', async () => {
    const input = {
      propertyId: '550e8400-e29b-41d4-a716-446655440000',
      guestName: 'Ana López',
      score: 5,
      comment: 'Perfecto',
    };

    const insertedReview = {
      id: 'review-uuid-2',
      property_id: input.propertyId,
      guest_name: input.guestName,
      score: input.score,
      comment: input.comment,
      created_at: new Date('2024-07-01'),
    };

    // Scores: [5, 4, 3] → media = 4.0
    mockResults['reviews.insert.returning'] = [insertedReview];
    mockResults['reviews.where.select'] = [{ score: 5 }, { score: 4 }, { score: 3 }];
    mockResults['property_ratings.insert.onConflict.merge'] = undefined;

    await createReview(input);

    const ratingInsert = dbCalls.find(
      (c) => c.table === 'property_ratings' && c.method === 'insert',
    );
    const ratingData = ratingInsert!.args[0] as Record<string, unknown>;
    expect(ratingData.star_rating).toBe(4);
  });
});

describe('reviewService — listReviews', () => {
  beforeEach(() => {
    dbCalls = [];
    mockResults = {};
  });

  it('ordena por created_at desc', async () => {
    const propertyId = '550e8400-e29b-41d4-a716-446655440000';
    const reviews = [
      { id: '1', property_id: propertyId, guest_name: 'A', score: 5, comment: 'a', created_at: new Date('2024-06-15') },
      { id: '2', property_id: propertyId, guest_name: 'B', score: 3, comment: 'b', created_at: new Date('2024-06-10') },
    ];

    mockResults['reviews.where.orderBy'] = reviews;

    const result = await listReviews(propertyId);

    expect(result).toEqual(reviews);

    // Verificar que se usó orderBy con created_at desc
    const orderByCall = dbCalls.find((c) => c.method === 'orderBy');
    expect(orderByCall).toBeDefined();
    expect(orderByCall!.args).toEqual(['created_at', 'desc']);
  });

  it('retorna array vacío si no hay reseñas', async () => {
    const propertyId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    mockResults['reviews.where.orderBy'] = [];

    const result = await listReviews(propertyId);

    expect(result).toEqual([]);
  });

  it('filtra por el propertyId correcto', async () => {
    const propertyId = '123e4567-e89b-12d3-a456-426614174000';

    mockResults['reviews.where.orderBy'] = [];

    await listReviews(propertyId);

    const whereCall = dbCalls.find((c) => c.method === 'where');
    expect(whereCall).toBeDefined();
    expect(whereCall!.args[0]).toEqual({ property_id: propertyId });
  });
});

describe('reviewService — getRating', () => {
  beforeEach(() => {
    dbCalls = [];
    mockResults = {};
  });

  it('retorna starRating null y reviewCount 0 sin reseñas (sin fila en property_ratings)', async () => {
    const propertyId = '550e8400-e29b-41d4-a716-446655440000';

    mockResults['property_ratings.where.first'] = undefined;

    const result = await getRating(propertyId);

    expect(result).toEqual({
      propertyId,
      starRating: null,
      reviewCount: 0,
    });
  });

  it('retorna starRating y reviewCount correctos cuando existen', async () => {
    const propertyId = '550e8400-e29b-41d4-a716-446655440000';

    mockResults['property_ratings.where.first'] = {
      property_id: propertyId,
      star_rating: 4.2,
      review_count: 10,
      updated_at: new Date(),
    };

    const result = await getRating(propertyId);

    expect(result).toEqual({
      propertyId,
      starRating: 4.2,
      reviewCount: 10,
    });
  });

  it('consulta property_ratings por el propertyId correcto', async () => {
    const propertyId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    mockResults['property_ratings.where.first'] = undefined;

    await getRating(propertyId);

    const whereCall = dbCalls.find(
      (c) => c.table === 'property_ratings' && c.method === 'where',
    );
    expect(whereCall).toBeDefined();
    expect(whereCall!.args[0]).toEqual({ property_id: propertyId });
  });
});
