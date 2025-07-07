import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  store: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  stock: number;
  image?: string;
  category: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  image: { type: String },
  category: { type: String, required: true },
  available: { type: Boolean, default: true },
}, {
  timestamps: true
});

// Unique product name per store
ProductSchema.index({ store: 1, name: 1 }, { unique: true });

export default mongoose.model<IProduct>('Product', ProductSchema);
