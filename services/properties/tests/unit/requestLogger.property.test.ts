import fc from 'fast-check';
import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';

// Mock pino antes de importar el módulo
const mockInfo = jest.fn();
jest.mock('pino', () => {
  return jest.fn(() => ({
    info: mockInfo,
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  }));
});

// Mock config/env para evitar requireEnv fallando
jest.mock('../../src/config/env', () => ({
  LOG_LEVEL: 'info',
}));

import { requestLogger } from '../../src/middleware/requestLogger';

/**
 * Property 21: Logs estructurados por request
 *
 * Para cualquier combinación de method/path/statusCode, el log emitido por
 * requestLogger es JSON válido con los cuatro campos requeridos (method, path,
 * statusCode, durationMs) y no contiene campos sensibles.
 *
 * **Validates: Requirements 15.3, 15.4**
 */
describe('Property 21: Logs estructurados por request', () => {
  beforeEach(() => {
    mockInfo.mockClear();
  });

  const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH');
  const pathArb = fc.string({ minLength: 1, maxLength: 200 });
  const statusCodeArb = fc.integer({ min: 100, max: 599 });

  it('emite log JSON con method, path, statusCode y durationMs para cualquier request', () => {
    fc.assert(
      fc.property(
        httpMethodArb,
        pathArb,
        statusCodeArb,
        (method, path, statusCode) => {
          mockInfo.mockClear();

          const req = {
            method,
            path,
            headers: { authorization: 'Bearer token-xyz' },
            body: { password: 'secret123', auth: 'credentials' },
          } as unknown as Request;

          const res = new EventEmitter() as unknown as Response & EventEmitter;
          (res as any).statusCode = statusCode;

          const next: NextFunction = jest.fn();

          requestLogger(req, res, next);
          (res as EventEmitter).emit('finish');

          // Verificar que se emitió exactamente un log
          expect(mockInfo).toHaveBeenCalledTimes(1);

          const logObj = mockInfo.mock.calls[0][0];

          // El log puede ser serializado como JSON válido
          const jsonStr = JSON.stringify(logObj);
          expect(() => JSON.parse(jsonStr)).not.toThrow();

          // Contiene los cuatro campos requeridos con tipos correctos
          expect(logObj).toHaveProperty('method', method);
          expect(typeof logObj.method).toBe('string');

          expect(logObj).toHaveProperty('path', path);
          expect(typeof logObj.path).toBe('string');

          expect(logObj).toHaveProperty('statusCode', statusCode);
          expect(typeof logObj.statusCode).toBe('number');

          expect(logObj).toHaveProperty('durationMs');
          expect(typeof logObj.durationMs).toBe('number');
          expect(logObj.durationMs).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no incluye campos sensibles (body, headers, auth, password) en el log', () => {
    fc.assert(
      fc.property(
        httpMethodArb,
        pathArb,
        statusCodeArb,
        (method, path, statusCode) => {
          mockInfo.mockClear();

          const req = {
            method,
            path,
            headers: { authorization: 'Bearer super-secret-token' },
            body: { password: 'p4ssw0rd!', auth: 'creds', token: 'jwt-token' },
          } as unknown as Request;

          const res = new EventEmitter() as unknown as Response & EventEmitter;
          (res as any).statusCode = statusCode;

          const next: NextFunction = jest.fn();

          requestLogger(req, res, next);
          (res as EventEmitter).emit('finish');

          const logObj = mockInfo.mock.calls[0][0];
          const logStr = JSON.stringify(logObj);

          // No contiene campos sensibles
          expect(logObj).not.toHaveProperty('body');
          expect(logObj).not.toHaveProperty('headers');
          expect(logObj).not.toHaveProperty('auth');
          expect(logObj).not.toHaveProperty('password');
          expect(logObj).not.toHaveProperty('authorization');
          expect(logObj).not.toHaveProperty('token');

          // Verificar que los valores sensibles no aparecen en el JSON serializado
          expect(logStr).not.toContain('super-secret-token');
          expect(logStr).not.toContain('p4ssw0rd!');
          expect(logStr).not.toContain('jwt-token');
        }
      ),
      { numRuns: 100 }
    );
  });
});
