import { Request, Response } from 'express';
import Dish from '../models/Dish';
import Hotel from '../models/Hotel';

// Add a new dish for the hotel manager's hotel
// Extend Express Request to include user (if not already done in your types)
interface AuthRequest extends Request {
  user: { _id: string };
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// Public: Get all dishes for a hotel by hotelId
export const getDishesByHotelId = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    if (!hotelId || hotelId.length !== 24) {
      return res.status(400).json({ message: 'Invalid hotelId' });
    }
    const dishes = await Dish.find({ hotel: hotelId, available: true }).lean();
    if (!dishes.length) {
      return res.status(404).json({ message: 'No dishes found for this hotel' });
    }
    res.json(dishes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dishes', error: err instanceof Error ? err.message : err });
  }
};

export const addDish = async (req: AuthRequest, res: Response) => {
  try {
    const manager = req.user._id;
    const hotel = await Hotel.findOne({ manager });
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

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
      return res.status(400).json({ message: 'Missing required fields', body: req.body });
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

// (Optional) Delete a dish
export const deleteDish = async (req: AuthRequest, res: Response) => {
  try {
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
