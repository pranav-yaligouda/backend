/**
 * Dish Search Controller
 * Provides advanced search endpoints for dishes across all hotels.
 * All responses follow the { success, data, error } structure for consistency.
 */
import { Request, Response } from 'express';
import Dish from '../models/Dish';
import Hotel from '../models/Hotel';
import { safeObjectId, eq, safeString, safeStringArray } from '../lib/safeQuery';

/**
 * Search for dishes across all hotels with advanced filters.
 * Supports filtering by name, meal type, cuisine, category, dietary tags, hotel, and pagination.
 * Returns paginated results.
 */
export const searchDishes = async (req: Request, res: Response) => {
  try {
    const { query, mealType, cuisineType, category, dishName, dietaryTags, hotel, page = 1, pageSize = 20 } = req.query;
    let dishFilter: any = {};
    if (query) {
      dishFilter.name = { $regex: safeString(query) };
    }
    if (mealType) {
      dishFilter.mealType = mealType;
    }
    if (cuisineType) {
      dishFilter.cuisineType = cuisineType;
    }
    if (category) {
      dishFilter.category = category;
    }
    if (dishName) {
      dishFilter.dishName = dishName;
    }
    if (dietaryTags) {
      dishFilter.dietaryTags = { $all: safeStringArray(dietaryTags) };
    }
    if (hotel) {
      dishFilter.hotel = eq(hotel);
    }
    const skip = (Number(page) - 1) * Number(pageSize);
    const [dishes, total] = await Promise.all([
      Dish.find(dishFilter)
        .populate('hotel')
        .skip(skip)
        .limit(Number(pageSize)),
      Dish.countDocuments(dishFilter)
    ]);
    res.json({
      dishes,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize))
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to search dishes', error: err });
  }
};
