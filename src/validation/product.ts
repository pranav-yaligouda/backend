import { Request, Response, NextFunction } from 'express';

export function validateProduct(req: Request, res: Response, next: NextFunction) {
  const { name, price, stock, category } = req.body;
  if (!name || typeof name !== 'string' || name.length < 2) {
    return res.status(400).json({ message: 'Product name is required and must be at least 2 characters.' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ message: 'Price must be a non-negative number.' });
  }
  if (typeof stock !== 'number' || stock < 0) {
    return res.status(400).json({ message: 'Stock must be a non-negative number.' });
  }
  if (!category || typeof category !== 'string') {
    return res.status(400).json({ message: 'Category is required and must be a string.' });
  }
  next();
}
