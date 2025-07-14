import mongoose, { Document, Schema } from 'mongoose';
import Product, { IProduct } from './Product';

export interface IStoreProduct extends Document {
  storeId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId | IProduct; // Allow for population
  price: number;
  quantity: number;
}

const StoreProductSchema = new Schema<IStoreProduct>({
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
}, { timestamps: true });

// ========================================
// PRODUCTION DATABASE INDEXES
// ========================================

// Primary unique index (already exists)
StoreProductSchema.index({ storeId: 1, productId: 1 }, { unique: true });

// Store-specific query optimization
StoreProductSchema.index({ storeId: 1, quantity: 1 }); // Store inventory by quantity
StoreProductSchema.index({ storeId: 1, price: 1 }); // Store inventory by price
StoreProductSchema.index({ storeId: 1, createdAt: -1 }); // Store inventory by date added

// Product-specific query optimization
StoreProductSchema.index({ productId: 1, quantity: 1 }); // Product availability across stores
StoreProductSchema.index({ productId: 1, price: 1 }); // Product pricing across stores
StoreProductSchema.index({ productId: 1, storeId: 1 }); // Product by store

// Inventory management indexes
StoreProductSchema.index({ quantity: 1 }); // Low stock products
StoreProductSchema.index({ quantity: 1, storeId: 1 }); // Low stock by store

// Price-based query optimization
StoreProductSchema.index({ price: 1 }); // Price sorting
StoreProductSchema.index({ price: 1, storeId: 1 }); // Price by store
StoreProductSchema.index({ price: 1, productId: 1 }); // Price by product

// Date-based queries
StoreProductSchema.index({ createdAt: -1 }); // Recently added products
StoreProductSchema.index({ updatedAt: -1 }); // Recently updated products
StoreProductSchema.index({ storeId: 1, updatedAt: -1 }); // Store updates

// Compound indexes for complex queries
StoreProductSchema.index({ 
  storeId: 1, 
  quantity: 1, 
  price: 1 
}); // Store inventory with quantity and price

StoreProductSchema.index({ 
  productId: 1, 
  quantity: 1, 
  price: 1 
}); // Product availability with quantity and price

// Performance optimization for aggregation queries
StoreProductSchema.index({ 
  storeId: 1, 
  quantity: 1, 
  createdAt: -1 
}); // Store inventory analytics

StoreProductSchema.index({ 
  productId: 1, 
  quantity: 1, 
  createdAt: -1 
}); // Product analytics

export default mongoose.model<IStoreProduct>('StoreProduct', StoreProductSchema);

// Type guard to check if productId is populated
export function isPopulatedProduct(sp: IStoreProduct): sp is IStoreProduct & { productId: IProduct } {
  return sp.productId && typeof sp.productId === 'object' && 'name' in sp.productId;
} 