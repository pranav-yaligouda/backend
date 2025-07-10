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

StoreProductSchema.index({ storeId: 1, productId: 1 }, { unique: true });

export default mongoose.model<IStoreProduct>('StoreProduct', StoreProductSchema);

// Type guard to check if productId is populated
export function isPopulatedProduct(sp: IStoreProduct): sp is IStoreProduct & { productId: IProduct } {
  return sp.productId && typeof sp.productId === 'object' && 'name' in sp.productId;
} 