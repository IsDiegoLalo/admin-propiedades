import fc from 'fast-check';
import { createPropertySchema } from '../../src/validators/propertyValidator';

/**
 * Property 2: Rechazo universal de propiedades inválidas
 *
 * Para cualquier request de creación de propiedad con al menos un campo obligatorio
 * ausente o con un valor inválido, el servicio debe rechazar con errores de validación.
 *
 * **Validates: Requirements 1.3, 8.1, 8.2**
 */
describe('Property 2: Rechazo universal de propiedades inválidas', () => {
  // Helper: genera un request válido base para poder invalidar campos selectivamente
  const validPropertyArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    type: fc.constantFrom('house' as const, 'apartment' as const),
    address: fc.string({ minLength: 1, maxLength: 200 }),
    pricePerDayUSD: fc.double({ min: 0.01, max: 100000, noNaN: true }),
    currency: fc.constant('USD'),
    rooms: fc.integer({ min: 1, max: 50 }),
    maxGuests: fc.integer({ min: 1, max: 100 }),
  });

  it('rechaza requests con name faltante o vacío', () => {
    fc.assert(
      fc.property(
        validPropertyArb,
        (validBase) => {
          // Caso 1: name vacío (string de longitud 0)
          const withEmptyName = { ...validBase, name: '' };
          const result = createPropertySchema.safeParse(withEmptyName);
          expect(result.success).toBe(false);

          // Caso 2: name ausente (campo faltante)
          const { name, ...withoutName } = validBase;
          const resultMissing = createPropertySchema.safeParse(withoutName);
          expect(resultMissing.success).toBe(false);

          // Caso 3: name con tipo incorrecto (número en lugar de string)
          const withNumberName = { ...validBase, name: 12345 };
          const resultNumber = createPropertySchema.safeParse(withNumberName);
          expect(resultNumber.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rechaza requests con type distinto de house|apartment', () => {
    const invalidTypeArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
      (s) => s !== 'house' && s !== 'apartment'
    );

    fc.assert(
      fc.property(
        validPropertyArb,
        invalidTypeArb,
        (validBase, invalidType) => {
          const withInvalidType = { ...validBase, type: invalidType };
          const result = createPropertySchema.safeParse(withInvalidType);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rechaza requests con pricePerDayUSD negativo o cero', () => {
    const invalidPriceArb = fc.oneof(
      fc.double({ min: -100000, max: 0, noNaN: true }),
      fc.constant(0),
      fc.constant(-1)
    );

    fc.assert(
      fc.property(
        validPropertyArb,
        invalidPriceArb,
        (validBase, invalidPrice) => {
          const withInvalidPrice = { ...validBase, pricePerDayUSD: invalidPrice };
          const result = createPropertySchema.safeParse(withInvalidPrice);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rechaza requests con maxGuests no entero, negativo o cero', () => {
    const invalidMaxGuestsArb = fc.oneof(
      // Cero
      fc.constant(0),
      // Negativos
      fc.integer({ min: -1000, max: -1 }),
      // Decimales positivos (no enteros)
      fc.double({ min: 0.01, max: 100, noNaN: true }).filter(
        (n) => !Number.isInteger(n)
      )
    );

    fc.assert(
      fc.property(
        validPropertyArb,
        invalidMaxGuestsArb,
        (validBase, invalidMaxGuests) => {
          const withInvalidMaxGuests = { ...validBase, maxGuests: invalidMaxGuests };
          const result = createPropertySchema.safeParse(withInvalidMaxGuests);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('acepta requests con conjunto completo de campos válidos (round-trip)', () => {
    fc.assert(
      fc.property(
        validPropertyArb,
        (validRequest) => {
          const result = createPropertySchema.safeParse(validRequest);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.name).toBeDefined();
            expect(result.data.type).toMatch(/^(house|apartment)$/);
            expect(result.data.address).toBeDefined();
            expect(result.data.pricePerDayUSD).toBeGreaterThan(0);
            expect(Number.isInteger(result.data.rooms)).toBe(true);
            expect(result.data.rooms).toBeGreaterThan(0);
            expect(Number.isInteger(result.data.maxGuests)).toBe(true);
            expect(result.data.maxGuests).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
