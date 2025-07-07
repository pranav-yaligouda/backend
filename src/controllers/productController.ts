import { Request, Response, NextFunction } from 'express';
import Product, { ALLOWED_CATEGORIES } from '../models/Product';
import Store from '../models/Store';
import { AuthRequest } from '../types/AuthRequest';
import mongoose from 'mongoose';

// Get all products (public, paginated, filterable by store/category)
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (req.query.storeId && mongoose.Types.ObjectId.isValid(req.query.storeId as string)) {
      filter.store = req.query.storeId;
    }
    if (req.query.category && ALLOWED_CATEGORIES.includes(req.query.category as string)) {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }
    // isDeleted is filtered by model pre-hook, but ensure here for robustness
    filter.isDeleted = false;
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
    const product = await Product.findOne({ _id: id, isDeleted: false }).lean();
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
    const { storeId, store, name, description, price, stock, image, category, available, unit } = req.body;
    const resolvedStoreId = storeId || store;
    if (!resolvedStoreId || !mongoose.Types.ObjectId.isValid(resolvedStoreId)) {
      return res.status(400).json({ message: 'Invalid store ID' });
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid category. Allowed: ' + ALLOWED_CATEGORIES.join(', ') });
    }
    // Ensure the store belongs to this owner
    const storeDoc = await Store.findOne({ _id: resolvedStoreId, owner });
    if (!storeDoc) return res.status(403).json({ message: 'You can only add products to your own store.' });
    const product = await Product.create({ store: resolvedStoreId, name, description, price, stock, image, category, available, unit });
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
    const product = await Product.findOne({ _id: id, isDeleted: false });
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
    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Invalid category. Allowed: ' + ALLOWED_CATEGORIES.join(', ') });
      }
      product.category = category;
    }
    if (available !== undefined) product.available = available;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product', error: err instanceof Error ? err.message : err });
  }
};

// Delete product (store owner only, soft delete)
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
    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    // Ensure the product belongs to a store owned by this user
    const store = await Store.findOne({ _id: product.store, owner });
    if (!store) return res.status(403).json({ message: 'You can only delete products in your own store.' });
    product.isDeleted = true;
    await product.save();
    res.json({ success: true, data: null, error: null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product', error: err instanceof Error ? err.message : err });
  }
};

// Atomic stock decrement for order fulfillment (example helper)
export const decrementProductStock = async (productId: string, quantity: number) => {
  // Returns the updated product or null if insufficient stock
  return Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity }, isDeleted: false },
    { $inc: { stock: -quantity } },
    { new: true }
  );
};
