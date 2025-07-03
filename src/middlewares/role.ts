import { Request, Response, NextFunction } from 'express';

export function requireHotelManager(req: Request, res: Response, next: NextFunction) {
  // Robust type guard for user object
  if (!req.user || typeof req.user !== 'object' || (req.user as any).role !== 'hotel_manager') {
    return res.status(403).json({ message: 'Only hotel managers are allowed.' });
  }
  next();
}
