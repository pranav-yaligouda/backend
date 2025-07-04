import { Request, Response } from 'express';
import Hotel from '../models/Hotel';
import User from '../models/User';
import mongoose from 'mongoose';
import Dish from '../models/Dish';

interface AuthRequest extends Request {
  user?: any;
} 

// Get a single hotel by ID (for menu page, etc)
export const getHotelById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid hotel ID' });
  }
  try {
    const hotel = await Hotel.findById(id).lean();
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
    // Omit sensitive fields if any (e.g., manager, etc)
    res.json(hotel);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err instanceof Error ? err.message : err });
  }
};

// Get all hotels (for public homepage)
export const getAllHotels = async (req: Request, res: Response) => {
  try {
    const hotels = await Hotel.find().lean();
    // Populate dishes for each hotel
    const hotelsWithDishes = await Promise.all(hotels.map(async (hotel) => {
      const dishes = await Dish.find({ hotel: hotel._id }).lean();
      return { ...hotel, dishes };
    }));
    res.json(hotelsWithDishes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch hotels', error: err });
  }
};

// Create a hotel (called during hotel_manager registration or profile setup)
function isBase64Image(str: string): boolean {
  return typeof str === 'string' && /^data:image\/[a-zA-Z]+;base64,/.test(str);
}

export const createHotel = async (req: AuthRequest, res: Response) => {
  try {
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
    const existing = await Hotel.findOne({ manager });
    if (existing) return res.status(400).json({ message: 'Hotel already exists for this manager.' });
    const hotel = await Hotel.create({ name, image, timings, location, holidays, manager });
    res.status(201).json(hotelToJson(hotel));
  } catch (err) {
    res.status(500).json({ message: 'Failed to create hotel', error: err instanceof Error ? err.message : err });
  }
};

// Get hotel for logged-in manager
export const getMyHotel = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[getMyHotel] req.user:', req.user);
    // Try all common JWT user id fields
    const managerRaw = req.user?._id || req.user?.id || req.user?.sub;
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
export const updateMyHotel = async (req: AuthRequest, res: Response) => {
  try {
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

