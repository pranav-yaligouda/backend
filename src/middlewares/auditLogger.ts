import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/audit.log' })
  ]
});

export function getLogger(module: string) {
  return logger.child({ module });
}

export function auditLogger(req: Request, res: Response, next: NextFunction) {
  logger.info('API Request', {
    method: req.method,
    url: req.originalUrl,
    user: req.user?._id || null,
    ip: req.ip,
    body: req.body,
    query: req.query
  });
  next();
}
