/**
 * Hotel Controller
 * Handles hotel management, hotel info, and hotel-dish population endpoints.
 * All responses follow the { success, data, error } structure for consistency.
 */
import { NextFunction, Response } from 'express';
import Hotel from '../models/Hotel';
import User from '../models/User';
import mongoose from 'mongoose';
import Dish from '../models/Dish';

import { AuthRequest } from '../types/AuthRequest';

/**
 * Get a single hotel by its ID (public endpoint).
 * Returns hotel info or error if not found.
 */
export const getHotelById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.json({ success: false, data: null, error: 'Invalid hotel ID' });
  }
  try {
    const hotel = await Hotel.findById(id).lean();
    if (!hotel) return res.json({ success: false, data: null, error: 'Hotel not found' });
    // Omit sensitive fields if any (e.g., manager, etc)
    res.json({ success: true, data: hotel, error: null });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all hotels (paginated, filterable, public endpoint).
 * GET /api/v1/hotels?page=1&limit=20&search=...&location=...
 * Returns paginated hotels, each with their associated dishes.
 * Response: { success, data: { items, page, limit, totalPages, totalItems }, error }
 */
import { Request } from 'express';

export const getAllHotels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }
    if (req.query.location) {
      filter.location = { $regex: req.query.location, $options: 'i' };
    }
    // Add more filters as needed
    const [hotels, totalItems] = await Promise.all([
      Hotel.find(filter).skip(skip).limit(limit).lean(),
      Hotel.countDocuments(filter)
    ]);
    // Populate dishes for each hotel
    const hotelsWithDishes = await Promise.all(hotels.map(async (hotel) => {
      const dishes = await Dish.find({ hotel: hotel._id, available: true }).lean();
      return { ...hotel, dishes };
    }));
    res.json({
      success: true,
      data: {
        items: hotelsWithDishes,
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

/**
 * Create a new hotel for the authenticated hotel manager.
 * Requires authentication and hotel manager role.
 * Validates image format and size if provided.
 */
function isBase64Image(str: string): boolean {
  return typeof str === 'string' && /^data:image\/[a-zA-Z]+;base64,/.test(str);
}

export const createHotel = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const manager = req.user._id;
    if (!mongoose.Types.ObjectId.isValid(manager)) {
      return res.status(400).json({ message: 'Invalid manager ID' });
    }
    const { name, timings, location, holidays, image } = req.body;
    if (image) {
      if (!isBase64Image(image)) {
        return res.status(400).json({ message: 'Invalid image format' });
      }
      const imageSize = Buffer.byteLength(image, 'utf8');
      if (imageSize > 4 * 1024 * 1024) {
        return res.status(400).json({ message: 'Image too large (max 4MB)' });
      }
    }
    const existing = await Hotel.findOne({ manager: { $eq: manager } });
    if (existing) return res.status(400).json({ message: 'Hotel already exists for this manager.' });
    const hotel = await Hotel.create({ name, image, timings, location, holidays, manager });
    res.status(201).json(hotelToJson(hotel));
  } catch (err) {
    res.status(500).json({ message: 'Failed to create hotel', error: err instanceof Error ? err.message : err });
  }
};

// Get hotel for logged-in manager
/**
 * Get the authenticated hotel manager's hotel profile.
 * Requires authentication and hotel manager role.
 */
export const getMyHotel = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[getMyHotel] req.user:', req.user);
    // Try all common JWT user id fields
    const managerRaw = req.user?._id;
    if (!managerRaw) {
      console.error('[getMyHotel] No manager ID found in req.user:', req.user);
      return res.status(400).json({ message: 'No manager ID found in token/user context' });
    }
    let managerObjId;
    try {
      managerObjId = typeof managerRaw === 'string' ? new mongoose.Types.ObjectId(managerRaw) : managerRaw;
    } catch (e) {
      console.error('[getMyHotel] Invalid manager ID for ObjectId conversion:', managerRaw, e);
      return res.status(400).json({ message: 'Invalid manager ID' });
    }

    let hotel = await Hotel.findOne({ manager: managerObjId });
    console.log('[getMyHotel] manager:', managerObjId, 'hotel:', hotel);

    if (!hotel) {
      // Try to auto-create hotel for hotel_manager using hotelName from User
      const user = await User.findById(managerObjId);
      console.log('[getMyHotel] user:', user);
      if (user && user.role === 'hotel_manager' && user.hotelName) {
        // Double-check if a hotel already exists (race condition safety)
        const existingHotel = await Hotel.findOne({ manager: managerObjId });
        if (existingHotel) {
          hotel = existingHotel;
        } else {
          hotel = await Hotel.create({ name: user.hotelName, manager: user._id });
          console.log('[getMyHotel] auto-created hotel:', hotel);
        }
      } else {
        console.log('[getMyHotel] No hotel and cannot auto-create');
        return res.status(404).json({ message: 'Hotel not found' });
      }
    }
    res.json(hotelToJson(hotel));
  } catch (err: any) {
    console.error('[getMyHotel] error:', err);
    // If duplicate key error, return a clear message
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Hotel already exists for this manager.' });
    }
    res.status(500).json({ message: 'Failed to fetch hotel', error: err?.message || err });
  }
};

// Update hotel profile (name, image, timings, location)
/**
 * Update the authenticated hotel manager's hotel profile.
 * Requires authentication and hotel manager role.
 * Validates input before updating.
 */
export const updateMyHotel = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const manager = req.user._id;
    const { name, timings, location, holidays, image } = req.body;
    if (image) {
      if (!isBase64Image(image)) {
        return res.status(400).json({ message: 'Invalid image format' });
      }
      const imageSize = Buffer.byteLength(image, 'utf8');
      if (imageSize > 4 * 1024 * 1024) {
        return res.status(400).json({ message: 'Image too large (max 4MB)' });
      }
    }
    const hotel = await Hotel.findOne({ manager });
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
    if (name !== undefined) hotel.name = name;
    if (image !== undefined) hotel.image = image;
    if (timings !== undefined) hotel.timings = timings;
    if (location !== undefined) hotel.location = location;
    if (holidays !== undefined) hotel.holidays = holidays;
    await hotel.save();
    res.json(hotelToJson(hotel));
  } catch (err) {
    res.status(500).json({ message: 'Failed to update hotel', error: err instanceof Error ? err.message : err });
  }
};

// Helper to serialize hotel doc to plain object for frontend
function hotelToJson(hotel: any) {
  const obj = hotel.toObject({ getters: true, virtuals: false });
  // timings should always be a plain object now
  return obj;
}

