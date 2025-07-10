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

// Unique product name per category
ProductSchema.index({ category: 1, name: 1 }, { unique: true });

// Only return non-deleted products by default
ProductSchema.pre(/^find/, function (this: Query<any, any>, next) {
  this.where({ isDeleted: false });
  next();
});

export default mongoose.model<IProduct>('Product', ProductSchema);
