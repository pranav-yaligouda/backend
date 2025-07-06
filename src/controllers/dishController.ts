/**
 * Dish Controller
 * Handles dish creation, retrieval, and management endpoints for hotels.
 * All responses follow the { success, data, error } structure for consistency.
 */
import { NextFunction, Response } from 'express';
import Dish from '../models/Dish';
import Hotel from '../models/Hotel';

import { AuthRequest } from '../types/AuthRequest';

/**
 * Get all available dishes for a specific hotel by hotelId (public endpoint).
 * Returns an array of dishes or an empty array if none found.
 */
export const getDishesByHotelId = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { hotelId } = req.params;
    if (!hotelId || hotelId.length !== 24) {
      return res.json({ success: false, data: [], error: 'Invalid hotelId' });
    }
    const dishes = await Dish.find({ hotel: hotelId, available: true }).lean();
    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return res.json({ success: true, data: [], error: null });
    }
    res.json({ success: true, data: dishes, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: [], error: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Add a new dish to the authenticated hotel manager's hotel.
 * Requires authentication and hotel manager role.
 * Accepts multipart/form-data or JSON.
 */
export const addDish = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const manager = req.user._id;
    const hotel = await Hotel.findOne({ manager });
    if (!hotel) return res.json({ success: false, data: null, error: 'Hotel not found' });

    // Debug: log body and file
    console.log('DEBUG addDish req.body:', req.body);
    console.log('DEBUG addDish req.file:', req.file);

    // Accept both JSON and FormData (all strings)
    let { name, price, description, mealType, cuisineType, category, dishName, standardDish } = req.body;
    let dietaryTags = req.body.dietaryTags;

    // Accept both single and multiple dietaryTags
    if (typeof dietaryTags === 'string') dietaryTags = [dietaryTags];
    if (!Array.isArray(dietaryTags)) dietaryTags = [];

    // Accept either name or dishName (for fallback)
    if (!name && dishName) name = dishName;
    if (!dishName && name) dishName = name;

    let imageFilename = '';
    if (req.file) {
      imageFilename = req.file.filename;
    }

    // Validate fields
    if (!name || !price || !mealType || !cuisineType || !category || !dishName || !dietaryTags.length) {
      return res.json({ success: false, data: null, error: 'Missing required fields' });
    }

    // Always set standardDish (fallback to name if not provided)
    const finalStandardDish = standardDish || name;

    const dish = await Dish.create({
      hotel: hotel._id,
      name,
      price: Number(price),
      description: description || '',
      image: imageFilename,
      mealType,
      cuisineType,
      category,
      dishName,
      dietaryTags,
      standardDish: finalStandardDish
    });

    res.status(201).json(dish);
  } catch (err: any) {
    console.error('ERROR in addDish:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Dish already exists for this hotel', error: err.keyValue });
    }
    res.status(500).json({ message: 'Failed to add dish', error: err.message || err });
  }
};

// Get all dishes for the hotel manager's hotel (with pagination)
export const getMyDishes = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const manager = req.user._id;
    const hotel = await Hotel.findOne({ manager });
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    // Pagination
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.max(1, Math.min(Number(req.query.pageSize) || 10, 100)); // max 100/page
    const skip = (page - 1) * pageSize;

    const [dishes, total] = await Promise.all([
      Dish.find({ hotel: hotel._id })
        .skip(skip)
        .limit(pageSize),
      Dish.countDocuments({ hotel: hotel._id })
    ]);

    res.json({
      dishes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dishes', error: err });
  }
};

// Update a dish (PATCH /api/v1/dishes/:dishId)
/**
 * Update a dish by ID (hotel manager only).
 * Only allows updating fields belonging to the manager's hotel.
 * Validates ownership and supports partial updates.
 *
 * Request body: any subset of dish fields (name, price, description, etc.)
 * Response: { success, data, error }
 */
export const updateDish = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
    }
    const manager = req.user._id;
    const hotel = await Hotel.findOne({ manager });
    if (!hotel) return res.status(404).json({ success: false, data: null, error: 'Hotel not found' });
    const { dishId } = req.params;
    const dish = await Dish.findOne({ _id: dishId, hotel: hotel._id });
    if (!dish) return res.status(404).json({ success: false, data: null, error: 'Dish not found' });

    // Only allow updates to allowed fields
    const allowedFields = ['name', 'description', 'price', 'image', 'available', 'mealType', 'cuisineType', 'category', 'dishName', 'dietaryTags', 'standardDish'] as const;
    type AllowedField = typeof allowedFields[number];
    for (const key of Object.keys(req.body)) {
      if (allowedFields.includes(key as AllowedField)) {
        (dish as any)[key] = req.body[key];
      }
    }
    await dish.save();
    res.json({ success: true, data: dish, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err instanceof Error ? err.message : String(err) });
  }
};


/**
 * Public: Get all dishes (paginated, filterable)
 * GET /api/v1/dishes?page=1&limit=20&hotelId=...&category=...
 * Returns paginated, filtered dishes for all users.
 * Response: { success, data: { items, page, limit, totalPages, totalItems }, error }
 */
import { Request } from 'express';

export const getAllDishes = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
    const skip = (page - 1) * limit;
    const filter: any = { available: true };
    if (req.query.hotelId) filter.hotel = req.query.hotelId;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.mealType) filter.mealType = req.query.mealType;
    if (req.query.cuisineType) filter.cuisineType = req.query.cuisineType;
    // Add more filters as needed
    const [items, totalItems] = await Promise.all([
      Dish.find(filter).skip(skip).limit(limit).lean(),
      Dish.countDocuments(filter)
    ]);
    res.json({
      success: true,
      data: {
        items,
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

// (Optional) Delete a dish
export const deleteDish = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const manager = req.user._id;
    const hotel = await Hotel.findOne({ manager });
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
    const { dishId } = req.params;
    const dish = await Dish.findOneAndDelete({ _id: dishId, hotel: hotel._id });
    if (!dish) return res.status(404).json({ message: 'Dish not found' });
    res.json({ message: 'Dish deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete dish', error: err });
  }
};
