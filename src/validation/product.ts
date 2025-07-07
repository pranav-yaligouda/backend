import { Request, Response, NextFunction } from 'express';
import { ALLOWED_CATEGORIES } from '../models/Product';

export const validateProduct = (req: Request, res: Response, next: NextFunction) => {
  const { name, price, stock, category, description, image } = req.body;
  if (!name || typeof name !== 'string' || name.length < 2) {
    return res.status(400).json({ message: 'Product name is required and must be at least 2 characters.' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ message: 'Price must be a non-negative number.' });
  }
  if (typeof stock !== 'number' || stock < 0) {
    return res.status(400).json({ message: 'Stock must be a non-negative number.' });
  }
  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: 'Category is required and must be one of: ' + ALLOWED_CATEGORIES.join(', ') });
  }
  if (description && typeof description !== 'string') {
    return res.status(400).json({ message: 'Description must be a string.' });
  }
  if (image && typeof image !== 'string') {
    return res.status(400).json({ message: 'Image must be a string (URL or base64).' });
  }
  next();
};
