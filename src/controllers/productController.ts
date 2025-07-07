import { Request, Response, NextFunction } from 'express';
import Product from '../models/Product';
import Store from '../models/Store';
import { AuthRequest } from '../types/AuthRequest';
import mongoose from 'mongoose';

// Get all products (public, paginated, filterable by store)
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (req.query.storeId && mongoose.Types.ObjectId.isValid(req.query.storeId as string)) {
      filter.store = req.query.storeId;
    }
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }
    const [products, totalItems] = await Promise.all([
      Product.find(filter).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter)
    ]);
    res.json({
      success: true,
      data: {
        items: products,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
        totalItems
      },
      error: null
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err instanceof Error ? err.message : String(err) });
  }
};

// Get a single product by ID (public)
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.json({ success: false, data: null, error: 'Invalid product ID' });
  }
  try {
    const product = await Product.findById(id).lean();
    if (!product) return res.json({ success: false, data: null, error: 'Product not found' });
    res.json({ success: true, data: product, error: null });
  } catch (err) {
    next(err);
  }
};

// Create a new product (store owner only)
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'store_owner') {
      return res.status(403).json({ message: 'Only store owners can create products.' });
    }
    const owner = req.user._id;
    const { storeId, name, description, price, stock, image, category, available } = req.body;
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ message: 'Invalid store ID' });
    }
    // Ensure the store belongs to this owner
    const store = await Store.findOne({ _id: storeId, owner });
    if (!store) return res.status(403).json({ message: 'You can only add products to your own store.' });
    const product = await Product.create({ store: storeId, name, description, price, stock, image, category, available });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create product', error: err instanceof Error ? err.message : err });
  }
};

// Update product (store owner only)
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'store_owner') {
      return res.status(403).json({ message: 'Only store owners can update products.' });
    }
    const owner = req.user._id;
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    // Ensure the product belongs to a store owned by this user
    const store = await Store.findOne({ _id: product.store, owner });
    if (!store) return res.status(403).json({ message: 'You can only update products in your own store.' });
    const { name, description, price, stock, image, category, available } = req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (image !== undefined) product.image = image;
    if (category !== undefined) product.category = category;
    if (available !== undefined) product.available = available;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product', error: err instanceof Error ? err.message : err });
  }
};

// Delete product (store owner only)
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'store_owner') {
      return res.status(403).json({ message: 'Only store owners can delete products.' });
    }
    const owner = req.user._id;
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    // Ensure the product belongs to a store owned by this user
    const store = await Store.findOne({ _id: product.store, owner });
    if (!store) return res.status(403).json({ message: 'You can only delete products in your own store.' });
    await product.deleteOne();
    res.json({ success: true, data: null, error: null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product', error: err instanceof Error ? err.message : err });
  }
};
