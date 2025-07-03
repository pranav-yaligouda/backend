import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Validation error', errors: result.error.errors });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ message: 'Validation error', errors: result.error.errors });
    }
    req.query = result.data;
    next();
  };
}
