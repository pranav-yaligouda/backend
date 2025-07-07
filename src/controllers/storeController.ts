import { Request, Response, NextFunction } from 'express';
import Store from '../models/Store';
import User from '../models/User';
import { AuthRequest } from '../types/AuthRequest';
import mongoose from 'mongoose';

// Get all stores (public, paginated)
export const getAllStores = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }
    const [stores, totalItems] = await Promise.all([
      Store.find(filter).skip(skip).limit(limit).lean(),
      Store.countDocuments(filter)
    ]);
    res.json({
      success: true,
      data: {
        items: stores,
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

// Get a single store by ID (public)
export const getStoreById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.json({ success: false, data: null, error: 'Invalid store ID' });
  }
  try {
    const store = await Store.findById(id).lean();
    if (!store) return res.json({ success: false, data: null, error: 'Store not found' });
    res.json({ success: true, data: store, error: null });
  } catch (err) {
    next(err);
  }
};

// Create a new store (store owner only)
export const createStore = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'store_owner') {
      return res.status(403).json({ message: 'Only store owners can create stores.' });
    }
    // Robustly get the owner ID from req.user._id or req.user.id
    let ownerRaw = req.user._id || req.user.id;
    if (!ownerRaw || typeof ownerRaw !== 'string' || !mongoose.Types.ObjectId.isValid(ownerRaw)) {
      return res.status(400).json({ message: 'Invalid or missing store owner ID in token/user context' });
    }
    const owner = new mongoose.Types.ObjectId(ownerRaw);
    const { name, address, image, location } = req.body;
    const existing = await Store.findOne({ owner });
    if (existing) return res.status(400).json({ message: 'Store already exists for this owner.' });
    const store = await Store.create({ name, address, image, location, owner });
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create store', error: err instanceof Error ? err.message : err });
  }
};

// Helper to serialize store doc to plain object for frontend
function storeToJson(store: any) {
  const obj = store.toObject({ getters: true, virtuals: false });
  return obj;
}

// Get my store (store owner only)
export const getMyStore = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[getMyStore] req.user:', req.user);
    // Try all common JWT user id fields
    const ownerRaw = req.user?._id || req.user?.id;
    if (!ownerRaw) {
      console.error('[getMyStore] No owner ID found in req.user:', req.user);
      return res.status(400).json({ success: false, data: null, error: 'No owner ID found in token/user context' });
    }
    let ownerObjId;
    try {
      ownerObjId = typeof ownerRaw === 'string' ? new mongoose.Types.ObjectId(ownerRaw) : ownerRaw;
    } catch (e) {
      console.error('[getMyStore] Invalid owner ID for ObjectId conversion:', ownerRaw, e);
      return res.status(400).json({ success: false, data: null, error: 'Invalid owner ID' });
    }

    let store = await Store.findOne({ owner: ownerObjId });
    console.log('[getMyStore] owner:', ownerObjId, 'store:', store);

    if (!store) {
      // Try to auto-create store for store_owner using storeName or name from User
      const user = await User.findById(ownerObjId);
      console.log('[getMyStore] user:', user);
      if (user && user.role === 'store_owner' && (user.storeName || user.name)) {
        // Double-check if a store already exists (race condition safety)
        const existingStore = await Store.findOne({ owner: ownerObjId });
        if (existingStore) {
          store = existingStore;
        } else {
          store = await Store.create({ name: user.storeName || user.name, owner: user._id });
          console.log('[getMyStore] auto-created store:', store);
        }
      } else {
        console.log('[getMyStore] No store and cannot auto-create');
        return res.status(404).json({ success: false, data: null, error: 'Store not found and cannot auto-create' });
      }
    }
    return res.json({ success: true, data: storeToJson(store), error: null });
  } catch (err: any) {
    console.error('[getMyStore] error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, data: null, error: 'Store already exists for this owner.' });
    }
    return res.status(500).json({ success: false, data: null, error: err?.message || err });
  }
};

// Update my store (store owner only)
export const updateMyStore = async (req: AuthRequest, res: Response) => {
  // LOG: updateMyStore debug
  console.log('[updateMyStore] req.user:', req.user);
  try {
    if (!req.user || req.user.role !== 'store_owner') {
      return res.status(403).json({ success: false, data: null, error: 'Only store owners can update their store.' });
    }
    let ownerRaw = req.user._id || req.user.id;
    if (!ownerRaw || typeof ownerRaw !== 'string' || !mongoose.Types.ObjectId.isValid(ownerRaw)) {
      console.error('[getMyStore] Invalid or missing store owner ID:', ownerRaw);
      return res.status(400).json({ success: false, data: null, error: 'Invalid store owner ID' });
    }
    const ownerId = new mongoose.Types.ObjectId(ownerRaw);
    let store = await Store.findOne({ owner: ownerId });
    if (!store) return res.status(404).json({ success: false, data: null, error: 'Store not found.' });

    // Update allowed fields
    const { name, address, image, location } = req.body;
    if (name !== undefined) store.name = name;
    if (address !== undefined) store.address = address;
    if (image !== undefined) store.image = image;
    if (location !== undefined) store.location = location;
    // Add other fields as needed

    await store.save();
    return res.json({ success: true, data: store, error: null });
  } catch (err) {
    return res.status(500).json({ success: false, data: null, error: err instanceof Error ? err.message : String(err) });
  }
};

// Delete my store (store owner only)
export const deleteMyStore = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'store_owner') {
      return res.status(403).json({ message: 'Only store owners can delete their store.' });
    }
    // Robustly get the owner ID from req.user._id or req.user.id
    let ownerRaw = req.user._id || req.user.id;
    if (!ownerRaw || typeof ownerRaw !== 'string' || !mongoose.Types.ObjectId.isValid(ownerRaw)) {
      return res.status(400).json({ message: 'Invalid or missing store owner ID in token/user context' });
    }
    const owner = new mongoose.Types.ObjectId(ownerRaw);
    const store = await Store.findOneAndDelete({ owner });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json({ success: true, data: null, error: null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete store', error: err instanceof Error ? err.message : err });
  }
};
