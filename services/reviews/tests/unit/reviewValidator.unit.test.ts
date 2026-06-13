import { createReviewSchema } from '../../src/validators/reviewValidator';

/**
 * Unit tests para reviewValidator.ts
 * Validates: Requirements 16.3
 *
 * Complementa los property tests cubriendo casos específicos de validación:
 * - comment vacío / solo whitespace
 * - guestName vacío
 * - propertyId no UUID
 * - sanitización XSS en comment
 */

const validInput = {
  propertyId: '550e8400-e29b-41d4-a716-446655440000',
  guestName: 'María García',
  score: 4,
  comment: 'Muy buena estadía, todo limpio.',
};

describe('reviewValidator — validación de comment', () => {
  it('rechaza comment vacío (string vacío)', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      comment: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const commentErrors = result.error.issues.filter(
        (i) => i.path.includes('comment'),
      );
      expect(commentErrors.length).toBeGreaterThan(0);
    }
  });

  it('rechaza comment con solo espacios en blanco', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      comment: '    ',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const commentErrors = result.error.issues.filter(
        (i) => i.path.includes('comment'),
      );
      expect(commentErrors.length).toBeGreaterThan(0);
    }
  });

  it('rechaza comment con solo tabs y newlines', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      comment: '\t\n\r  ',
    });
    expect(result.success).toBe(false);
  });

  it('acepta comment con contenido válido', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      comment: 'Excelente lugar para vacacionar.',
    });
    expect(result.success).toBe(true);
  });
});

describe('reviewValidator — validación de guestName', () => {
  it('rechaza guestName vacío', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      guestName: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameErrors = result.error.issues.filter(
        (i) => i.path.includes('guestName'),
      );
      expect(nameErrors.length).toBeGreaterThan(0);
    }
  });

  it('acepta guestName con un carácter mínimo', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      guestName: 'A',
    });
    expect(result.success).toBe(true);
  });
});

describe('reviewValidator — validación de propertyId', () => {
  it('rechaza propertyId que no es UUID', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      propertyId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const idErrors = result.error.issues.filter(
        (i) => i.path.includes('propertyId'),
      );
      expect(idErrors.length).toBeGreaterThan(0);
    }
  });

  it('rechaza propertyId numérico', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      propertyId: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza propertyId vacío', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      propertyId: '',
    });
    expect(result.success).toBe(false);
  });

  it('acepta propertyId UUID v4 válido', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      propertyId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    });
    expect(result.success).toBe(true);
  });
});

describe('reviewValidator — sanitización XSS en comment', () => {
  it('acepta comment con contenido XSS pero sanitiza el output (sin scripts)', () => {
    const xssPayload = '<script>alert("xss")</script>Buena propiedad';
    const result = createReviewSchema.safeParse({
      ...validInput,
      comment: xssPayload,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comment).not.toContain('<script>');
      expect(result.data.comment).not.toContain('</script>');
      expect(result.data.comment).toContain('Buena propiedad');
    }
  });

  it('sanitiza event handlers inline en comment', () => {
    const xssPayload = '<img src=x onerror="alert(1)">Lindo lugar';
    const result = createReviewSchema.safeParse({
      ...validInput,
      comment: xssPayload,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comment).not.toContain('onerror');
      expect(result.data.comment).toContain('Lindo lugar');
    }
  });

  it('sanitiza iframe en comment', () => {
    const xssPayload = '<iframe src="http://evil.com"></iframe>Buena ubicación';
    const result = createReviewSchema.safeParse({
      ...validInput,
      comment: xssPayload,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comment).not.toContain('<iframe');
      expect(result.data.comment).toContain('Buena ubicación');
    }
  });

  it('sanitiza guestName con payload XSS', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      guestName: '<script>alert("hack")</script>Carlos',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guestName).not.toContain('<script>');
      expect(result.data.guestName).toContain('Carlos');
    }
  });
});

describe('reviewValidator — validación de score', () => {
  it('rechaza score 0', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      score: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza score 6', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      score: 6,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza score negativo', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      score: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza score decimal', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      score: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it('acepta score 1 (mínimo)', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      score: 1,
    });
    expect(result.success).toBe(true);
  });

  it('acepta score 5 (máximo)', () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      score: 5,
    });
    expect(result.success).toBe(true);
  });
});
