import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string; // e.g., "South Indian", "Breakfast", "Dessert"
  parent?: mongoose.Types.ObjectId; // for sub-categories
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, unique: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Category' },
});

export default mongoose.model<ICategory>('Category', CategorySchema);
