import mongoose, { Document, Schema, Query } from 'mongoose';

export const ALLOWED_CATEGORIES = [
  'Vegetables', 'Fruits', 'Groceries', 'Medicines', 'Dairy', 'Household', 'Stationary'
];

export interface IProduct extends Document {
  name: string;
  description?: string;
  image?: string;
  category: string;
  available: boolean;
  unit: 'grams' | 'kg' | 'pieces';
  isDeleted?: boolean; // for soft delete
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  category: { type: String, required: true, enum: ALLOWED_CATEGORIES },
  available: { type: Boolean, default: true },
  unit: { type: String, enum: ['grams', 'kg', 'pieces'], default: 'pieces', required: true },
  isDeleted: { type: Boolean, default: false }, // soft delete
}, {
  timestamps: true
});

// ========================================
// PRODUCTION DATABASE INDEXES
// ========================================

// Primary unique index (already exists)
ProductSchema.index({ category: 1, name: 1 }, { unique: true });

// Category-based query optimization
ProductSchema.index({ category: 1, available: 1 }); // Available products by category
ProductSchema.index({ category: 1, isDeleted: 1 }); // Category with deletion status

// Availability-based queries
ProductSchema.index({ available: 1 }); // All available products
ProductSchema.index({ available: 1, category: 1 }); // Available products by category
ProductSchema.index({ available: 1, isDeleted: 1 }); // Available non-deleted products

// Soft delete optimization
ProductSchema.index({ isDeleted: 1 }); // Deletion status
ProductSchema.index({ isDeleted: 1, category: 1 }); // Deleted products by category
ProductSchema.index({ isDeleted: 1, available: 1 }); // Deleted products with availability

// Unit-based queries
ProductSchema.index({ unit: 1 }); // Products by unit
ProductSchema.index({ unit: 1, category: 1 }); // Unit by category
ProductSchema.index({ unit: 1, available: 1 }); // Available products by unit

// Name and search optimization
ProductSchema.index({ name: 1 }); // Product name lookup
ProductSchema.index({ name: 'text', description: 'text' }, { 
  weights: { name: 10, description: 5 },
  name: 'product_search_text'
}); // Text search for product discovery

// Date-based queries
ProductSchema.index({ createdAt: -1 }); // Recently created products
ProductSchema.index({ updatedAt: -1 }); // Recently updated products

// Compound indexes for complex queries
ProductSchema.index({ 
  category: 1, 
  available: 1, 
  isDeleted: 1 
}); // Category with availability and deletion status

ProductSchema.index({ 
  available: 1, 
  isDeleted: 1, 
  category: 1 
}); // Available non-deleted products by category

ProductSchema.index({ 
  category: 1, 
  unit: 1, 
  available: 1 
}); // Category products by unit and availability

ProductSchema.index({ 
  name: 1, 
  category: 1, 
  available: 1 
}); // Product name with category and availability

// Performance optimization for aggregation queries
ProductSchema.index({ 
  category: 1, 
  available: 1, 
  createdAt: -1 
}); // Category products analytics

ProductSchema.index({ 
  unit: 1, 
  available: 1, 
  category: 1 
}); // Unit-based analytics

ProductSchema.index({ 
  isDeleted: 1, 
  createdAt: -1 
}); // Deletion analytics

// Only return non-deleted products by default
ProductSchema.pre(/^find/, function (this: Query<any, any>, next) {
  this.where({ isDeleted: false });
  next();
});

export default mongoose.model<IProduct>('Product', ProductSchema);
