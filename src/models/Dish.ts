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

// Unique standardized dish per hotel
DishSchema.index({ hotel: 1, standardDish: 1 }, { unique: true });

export default mongoose.model<IDish>('Dish', DishSchema);
