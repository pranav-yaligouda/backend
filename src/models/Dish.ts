import mongoose, { Document, Schema } from 'mongoose';


export interface IDish extends Document {
  hotel: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  image?: string;
  available: boolean;
  mealType: string;
  cuisineType: string;
  category: string;
  dishName: string;
  dietaryTags: string[];
  standardDish?: string | null; // <-- Added for standardized dish uniqueness
  createdAt: Date;
  updatedAt: Date;
}

const DishSchema = new Schema<IDish>({
  hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  image: { type: String },
  available: { type: Boolean, default: true },
  mealType: { type: String, required: true },
  cuisineType: { type: String, required: true },
  category: { type: String, required: true },
  dishName: { type: String, required: true },
  dietaryTags: [{ type: String, required: true }],
  standardDish: { type: String, default: null, index: true } // <-- Added for standardized dish uniqueness
}, {
  timestamps: true
});

// ========================================
// PRODUCTION DATABASE INDEXES
// ========================================

// Primary unique index (already exists)
DishSchema.index({ hotel: 1, standardDish: 1 }, { unique: true });

// Hotel-specific query optimization
DishSchema.index({ hotel: 1, available: 1 }); // Hotel's available dishes
DishSchema.index({ hotel: 1, category: 1 }); // Hotel's dishes by category
DishSchema.index({ hotel: 1, mealType: 1 }); // Hotel's dishes by meal type
DishSchema.index({ hotel: 1, cuisineType: 1 }); // Hotel's dishes by cuisine
DishSchema.index({ hotel: 1, price: 1 }); // Hotel's dishes by price

// Availability-based queries
DishSchema.index({ available: 1 }); // All available dishes
DishSchema.index({ available: 1, hotel: 1 }); // Available dishes by hotel
DishSchema.index({ available: 1, category: 1 }); // Available dishes by category

// Category-based query optimization
DishSchema.index({ category: 1, available: 1 }); // Category with availability
DishSchema.index({ category: 1, price: 1 }); // Category with price
DishSchema.index({ category: 1, hotel: 1 }); // Category by hotel

// Meal type optimization
DishSchema.index({ mealType: 1, available: 1 }); // Meal type with availability
DishSchema.index({ mealType: 1, hotel: 1 }); // Meal type by hotel
DishSchema.index({ mealType: 1, category: 1 }); // Meal type with category

// Cuisine type optimization
DishSchema.index({ cuisineType: 1, available: 1 }); // Cuisine with availability
DishSchema.index({ cuisineType: 1, hotel: 1 }); // Cuisine by hotel
DishSchema.index({ cuisineType: 1, category: 1 }); // Cuisine with category

// Price-based query optimization
DishSchema.index({ price: 1 }); // Price sorting
DishSchema.index({ price: 1, available: 1 }); // Price with availability
DishSchema.index({ price: 1, hotel: 1 }); // Price by hotel
DishSchema.index({ price: 1, category: 1 }); // Price by category

// Dietary tags optimization
DishSchema.index({ dietaryTags: 1 }); // Dishes by dietary tags
DishSchema.index({ dietaryTags: 1, available: 1 }); // Available dishes by dietary tags
DishSchema.index({ dietaryTags: 1, hotel: 1 }); // Dietary tags by hotel

// Name and search optimization
DishSchema.index({ name: 1 }); // Dish name lookup
DishSchema.index({ dishName: 1 }); // Standardized dish name lookup
DishSchema.index({ name: 'text', description: 'text' }, { 
  weights: { name: 10, description: 5 },
  name: 'dish_search_text'
}); // Text search for dish discovery

// Date-based queries
DishSchema.index({ createdAt: -1 }); // Recently created dishes
DishSchema.index({ updatedAt: -1 }); // Recently updated dishes

// Compound indexes for complex queries
DishSchema.index({ 
  hotel: 1, 
  available: 1, 
  category: 1, 
  price: 1 
}); // Hotel's available dishes by category and price

DishSchema.index({ 
  hotel: 1, 
  available: 1, 
  mealType: 1, 
  cuisineType: 1 
}); // Hotel's available dishes by meal and cuisine

DishSchema.index({ 
  category: 1, 
  available: 1, 
  price: 1, 
  hotel: 1 
}); // Category dishes with availability, price, and hotel

DishSchema.index({ 
  mealType: 1, 
  available: 1, 
  category: 1, 
  hotel: 1 
}); // Meal type dishes with availability, category, and hotel

// Performance optimization for aggregation queries
DishSchema.index({ 
  hotel: 1, 
  available: 1, 
  createdAt: -1 
}); // Hotel's available dishes analytics

DishSchema.index({ 
  category: 1, 
  available: 1, 
  createdAt: -1 
}); // Category dishes analytics

DishSchema.index({ 
  price: 1, 
  available: 1, 
  hotel: 1 
}); // Price-based analytics by hotel

export default mongoose.model<IDish>('Dish', DishSchema);
