import { Request, Response, NextFunction } from 'express';
import Product, { ALLOWED_CATEGORIES } from '../models/Product';
import Store from '../models/Store';
import { AuthRequest } from '../types/AuthRequest';
import mongoose from 'mongoose';
import StoreProduct from '../models/StoreProduct';
import { isPopulatedProduct } from '../models/StoreProduct';

// Fetch global product catalog (optionally filter by category/search)
export const getCatalogProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const filter: Record<string, any> = {};
    if (category) filter['category'] = category;
    if (search) filter['name'] = { $regex: search, $options: 'i' };
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [items, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(parseInt(limit as string)),
      Product.countDocuments(filter)
    ]);
    res.json({ data: { items, total } });
  } catch (err) {
    next(err);
  }
};

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
    const { storeId, store, name, description, image, category, available, unit } = req.body;
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
    // Only create fields that exist in Product model
    const product = await Product.create({ name, description, image, category, available, unit });
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
    // Remove store check (Product does not have a store field)
    const { name, description, image, category, available, unit } = req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (image !== undefined) product.image = image;
    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Invalid category. Allowed: ' + ALLOWED_CATEGORIES.join(', ') });
      }
      product.category = category;
    }
    if (available !== undefined) product.available = available;
    if (unit !== undefined) product.unit = unit;
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
    // Remove store check (Product does not have a store field)
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

// Example: Add or link product to store inventory
// POST /api/v1/stores/:storeId/products
export const addProductToStore = async (req: Request, res: Response) => {
  const { name, description, image, category, unit, price, quantity } = req.body;
  const { storeId } = req.params;
  // 1. Find or create the product in the global catalog
  let product = await Product.findOne({ name, category });
  if (!product) {
    product = await Product.create({ name, description, image, category, unit });
  }
  // 2. Create or update the store's inventory for this product
  let storeProduct = await StoreProduct.findOne({ storeId, productId: product._id });
  if (storeProduct) {
    // Update price/quantity if already exists
    storeProduct.price = price;
    storeProduct.quantity = quantity;
    await storeProduct.save();
  } else {
    storeProduct = await StoreProduct.create({
      storeId,
      productId: product._id,
      price,
      quantity,
    });
  }
  res.status(201).json({ success: true, data: { product, storeProduct } });
};

// Get all available products from all stores (for grocery section)
export const getAllAvailableStoreProducts = async (req: Request, res: Response) => {
  try {
    const { storeId, category, search, page = 1, limit = 20 } = req.query;
    const filter: any = { quantity: { $gt: 0 } };
    if (storeId && typeof storeId === 'string') filter.storeId = storeId;
    // Find all store products with quantity > 0, and populate product details
    let query = StoreProduct.find(filter).populate('productId');
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    query = query.skip(skip).limit(Number(limit));
    let storeProducts = await query.exec();
    // Use type guard to filter only valid/populated storeProducts
    let items = storeProducts.filter(isPopulatedProduct);
    // Category and search filtering (on populated product)
    if (category && typeof category === 'string') {
      items = items.filter(sp => {
        if (!isPopulatedProduct(sp)) return false;
        return sp.productId.category === category;
      });
    }
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      items = items.filter(sp => {
        if (!isPopulatedProduct(sp)) return false;
        const { name, description } = sp.productId;
        return (
          (name && name.toLowerCase().includes(searchLower)) ||
          (description && description.toLowerCase().includes(searchLower))
        );
      });
    }
    // Map to frontend shape
    const mapped = items
      .filter(sp => isPopulatedProduct(sp))
      .map(sp => {
        const prod = sp.productId;
        return {
          ...prod.toObject(),
          price: sp.price,
          quantity: sp.quantity,
          storeId: sp.storeId,
          storeProductId: sp._id
        };
      });
    // Pagination for filtered results
    const paged = mapped.slice(0, Number(limit));
    res.json({
      success: true,
      data: {
        items: paged,
        page: Number(page),
        limit: Number(limit),
        totalItems: mapped.length,
        totalPages: Math.ceil(mapped.length / Number(limit))
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
};
