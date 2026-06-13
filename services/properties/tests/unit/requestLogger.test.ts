import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';

// Mock pino antes de importar el módulo
const mockInfo = jest.fn();
const mockError = jest.fn();
jest.mock('pino', () => {
  return jest.fn(() => ({
    info: mockInfo,
    error: mockError,
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

function createMockReqRes(method: string, path: string) {
  const req = {
    method,
    path,
    headers: { authorization: 'Bearer secret-token' },
    body: { password: 'super-secret' },
  } as unknown as Request;

  const res = new EventEmitter() as unknown as Response & EventEmitter;
  (res as any).statusCode = 200;

  return { req, res };
}

describe('requestLogger', () => {
  beforeEach(() => {
    mockInfo.mockClear();
  });

  it('loguea method, path, statusCode y durationMs al finalizar request', (done) => {
    const { req, res } = createMockReqRes('GET', '/properties');
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();

    // Simular fin de respuesta
    (res as any).statusCode = 200;
    (res as EventEmitter).emit('finish');

    // Verificar log
    expect(mockInfo).toHaveBeenCalledTimes(1);
    const logObj = mockInfo.mock.calls[0][0];
    expect(logObj).toHaveProperty('method', 'GET');
    expect(logObj).toHaveProperty('path', '/properties');
    expect(logObj).toHaveProperty('statusCode', 200);
    expect(logObj).toHaveProperty('durationMs');
    expect(typeof logObj.durationMs).toBe('number');
    expect(logObj.durationMs).toBeGreaterThanOrEqual(0);

    done();
  });

  it('no incluye datos sensibles en el log (body, headers, tokens)', (done) => {
    const { req, res } = createMockReqRes('POST', '/properties');
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);
    (res as any).statusCode = 201;
    (res as EventEmitter).emit('finish');

    const logObj = mockInfo.mock.calls[0][0];

    // Verificar ausencia de datos sensibles
    expect(logObj).not.toHaveProperty('body');
    expect(logObj).not.toHaveProperty('headers');
    expect(logObj).not.toHaveProperty('authorization');
    expect(logObj).not.toHaveProperty('password');
    expect(logObj).not.toHaveProperty('token');
    expect(JSON.stringify(logObj)).not.toContain('secret');

    done();
  });

  it('registra correctamente statusCode de error', (done) => {
    const { req, res } = createMockReqRes('POST', '/properties');
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);
    (res as any).statusCode = 422;
    (res as EventEmitter).emit('finish');

    const logObj = mockInfo.mock.calls[0][0];
    expect(logObj.statusCode).toBe(422);

    done();
  });

  it('llama next() para pasar al siguiente middleware', () => {
    const { req, res } = createMockReqRes('GET', '/health');
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
