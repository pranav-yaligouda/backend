import { Request, Response, NextFunction } from 'express';

export function validateStore(req: Request, res: Response, next: NextFunction) {
  const { name, address, image, location } = req.body;
  if (!name || typeof name !== 'string' || name.length < 2) {
    return res.status(400).json({ message: 'Store name is required and must be at least 2 characters.' });
  }
  if (address && typeof address !== 'string') {
    return res.status(400).json({ message: 'Address must be a string.' });
  }
  if (image && typeof image !== 'string') {
    return res.status(400).json({ message: 'Image must be a string (base64 or URL).' });
  }
  if (location && typeof location !== 'object') {
    return res.status(400).json({ message: 'Location must be an object.' });
  }
  next();
}
