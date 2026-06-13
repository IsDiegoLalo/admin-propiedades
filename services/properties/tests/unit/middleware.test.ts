import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';

// Mock config/env para evitar process.exit por variables faltantes
jest.mock('../../src/config/env', () => ({
  LOG_LEVEL: 'info',
}));

// Mock pino para evitar output en tests
jest.mock('pino', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };
  return jest.fn(() => mockLogger);
});

import { errorHandler } from '../../src/middleware/errorHandler';
import { NotFoundError, ConflictError, PaymentError } from '../../src/middleware/errors';

function createMockResponse(): Response {
  const res = {} as Partial<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/test',
    ...overrides,
  } as Request;
}

describe('errorHandler', () => {
  const mockNext: NextFunction = jest.fn();

  it('maneja ZodError con status 422 y details', () => {
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['name'],
        message: 'Required',
      },
      {
        code: 'invalid_type',
        expected: 'number',
        received: 'string',
        path: ['pricePerDayUSD'],
        message: 'Expected number, received string',
      },
    ];
    const zodError = new ZodError(issues);
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(zodError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: [
        { field: 'name', message: 'Required' },
        { field: 'pricePerDayUSD', message: 'Expected number, received string' },
      ],
    });
  });

  it('maneja NotFoundError con status 404', () => {
    const err = new NotFoundError('Property not found');
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Property not found' });
  });

  it('maneja ConflictError con status 409', () => {
    const err = new ConflictError('Booking dates overlap');
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Booking dates overlap' });
  });

  it('maneja PaymentError con status 402', () => {
    const err = new PaymentError('Payment declined');
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payment declined' });
  });

  it('maneja errores genéricos con status 500 sin exponer detalles internos', () => {
    const err = new Error('Database connection lost');
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('maneja objetos no-Error con status 500', () => {
    const err = 'unexpected string error';
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(err, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});

describe('errors.ts - custom error classes', () => {
  it('NotFoundError tiene name y message correctos', () => {
    const err = new NotFoundError('Resource not found');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.name).toBe('NotFoundError');
    expect(err.message).toBe('Resource not found');
  });

  it('ConflictError tiene name y message correctos', () => {
    const err = new ConflictError('Conflict detected');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.name).toBe('ConflictError');
    expect(err.message).toBe('Conflict detected');
  });

  it('PaymentError tiene name y message correctos', () => {
    const err = new PaymentError('Insufficient funds');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(PaymentError);
    expect(err.name).toBe('PaymentError');
    expect(err.message).toBe('Insufficient funds');
  });
});
