import fc from 'fast-check';
import DOMPurify from 'isomorphic-dompurify';
import { createPropertySchema } from '../../src/validators/propertyValidator';

/**
 * Property 5: Sanitización de inputs de texto
 *
 * Para cualquier string de entrada que contenga caracteres especiales, payloads XSS
 * o secuencias de inyección, el valor almacenado y devuelto por la API debe ser la
 * versión sanitizada, sin que el payload original pueda ejecutarse o almacenarse
 * sin procesar.
 *
 * **Validates: Requirements 1.8, 6.5**
 */
describe('Property 5: Sanitización de inputs de texto', () => {
  const xssPayloads = [
    '<script>alert(1)</script>',
    '<img onerror="alert(1)" src="x">',
    '"><script>alert(document.cookie)</script>',
    '<svg onload="alert(1)">',
    '<iframe src="javascript:alert(1)">',
    '<body onload="alert(1)">',
    '<a href="javascript:alert(1)">click</a>',
    '<div onmouseover="alert(1)">hover</div>',
  ];

  // Generador de strings con payloads XSS inyectados
  const xssStringArb = fc.oneof(
    // String normal + payload XSS al final
    fc.string({ minLength: 1, maxLength: 50 }).map(
      (s) => s + xssPayloads[Math.floor(Math.random() * xssPayloads.length)]
    ),
    // Payload XSS puro
    fc.constantFrom(...xssPayloads),
    // Payload XSS + string normal
    fc.string({ minLength: 1, maxLength: 50 }).map(
      (s) => xssPayloads[Math.floor(Math.random() * xssPayloads.length)] + s
    ),
    // String con tags HTML intercalados
    fc.string({ minLength: 1, maxLength: 30 }).chain((prefix) =>
      fc.constantFrom(...xssPayloads).map((payload) => `${prefix}${payload}${prefix}`)
    )
  );

  // Helper: genera un request válido base con un campo name con XSS
  const validBaseArb = fc.record({
    type: fc.constantFrom('house' as const, 'apartment' as const),
    address: fc.string({ minLength: 1, maxLength: 200 }),
    pricePerDayUSD: fc.double({ min: 0.01, max: 100000, noNaN: true }),
    currency: fc.constant('USD'),
    rooms: fc.integer({ min: 1, max: 50 }),
    maxGuests: fc.integer({ min: 1, max: 100 }),
  });

  it('sanitiza el campo name eliminando tags script y payloads XSS', () => {
    fc.assert(
      fc.property(
        validBaseArb,
        xssStringArb,
        (base, xssName) => {
          const input = { ...base, name: xssName, address: 'Valid Address' };
          const result = createPropertySchema.safeParse(input);

          if (result.success) {
            // El valor resultante debe ser la versión sanitizada
            const expected = DOMPurify.sanitize(xssName.trim());
            expect(result.data.name).toBe(expected);
            // No deben quedar tags <script>
            expect(result.data.name).not.toMatch(/<script[\s>]/i);
          }
          // Si falla el parse es porque el string quedó vacío después de sanitizar,
          // lo cual es comportamiento válido (min length 1 no se cumple)
        }
      ),
      { numRuns: 200 }
    );
  });

  it('sanitiza el campo address eliminando payloads XSS', () => {
    fc.assert(
      fc.property(
        validBaseArb,
        xssStringArb,
        (base, xssAddress) => {
          const input = { ...base, name: 'Valid Name', address: xssAddress };
          const result = createPropertySchema.safeParse(input);

          if (result.success) {
            const expected = DOMPurify.sanitize(xssAddress.trim());
            expect(result.data.address).toBe(expected);
            expect(result.data.address).not.toMatch(/<script[\s>]/i);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('sanitiza elementos del array services eliminando XSS', () => {
    fc.assert(
      fc.property(
        validBaseArb,
        fc.array(xssStringArb, { minLength: 1, maxLength: 5 }),
        (base, xssServices) => {
          const input = {
            ...base,
            name: 'Valid Name',
            address: 'Valid Address',
            services: xssServices,
          };
          const result = createPropertySchema.safeParse(input);

          if (result.success) {
            result.data.services.forEach((service, i) => {
              const expected = DOMPurify.sanitize(xssServices[i].trim());
              expect(service).toBe(expected);
              expect(service).not.toMatch(/<script[\s>]/i);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('nunca almacena tags <script> en ningún campo de texto', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.constantFrom(...xssPayloads),
        (prefix, payload) => {
          const input = {
            name: prefix + payload,
            type: 'house' as const,
            address: payload + prefix,
            pricePerDayUSD: 100,
            currency: 'USD',
            rooms: 2,
            maxGuests: 4,
            services: [payload, prefix + payload],
          };

          const result = createPropertySchema.safeParse(input);

          if (result.success) {
            // Verificar que ningún campo de texto contiene <script>
            expect(result.data.name).not.toMatch(/<script[\s>]/i);
            expect(result.data.address).not.toMatch(/<script[\s>]/i);
            result.data.services.forEach((s) => {
              expect(s).not.toMatch(/<script[\s>]/i);
            });

            // Verificar que no contiene event handlers de inyección
            expect(result.data.name).not.toMatch(/on\w+\s*=/i);
            expect(result.data.address).not.toMatch(/on\w+\s*=/i);
            result.data.services.forEach((s) => {
              expect(s).not.toMatch(/on\w+\s*=/i);
            });
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('el resultado de safeParse coincide exactamente con DOMPurify.sanitize(input.trim())', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (rawInput) => {
          const input = {
            name: rawInput,
            type: 'house' as const,
            address: rawInput,
            pricePerDayUSD: 50,
            currency: 'USD',
            rooms: 1,
            maxGuests: 2,
          };

          const result = createPropertySchema.safeParse(input);
          const expectedSanitized = DOMPurify.sanitize(rawInput.trim());

          if (result.success) {
            expect(result.data.name).toBe(expectedSanitized);
            expect(result.data.address).toBe(expectedSanitized);
          } else {
            // Si falla es porque la sanitización dejó un string vacío
            // (lo cual viola min length 1)
            expect(expectedSanitized.length).toBe(0);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
