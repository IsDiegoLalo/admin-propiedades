import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { LOG_LEVEL } from '../config/env';

export const logger = pino({ level: LOG_LEVEL });

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
}
