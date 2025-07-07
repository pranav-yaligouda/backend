import mongoose, { Document, Schema } from 'mongoose';

export interface IStore extends Document {
  name: string;
  owner: mongoose.Types.ObjectId; // reference to User
  image?: string;
  address?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address?: string;
  };
  timings?: {
    [day: string]: { open: string; close: string; holiday: boolean };
  };
  holidays?: string[];
  categories?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>({
  name: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // one store per owner
  image: { type: String },
  address: { type: String },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: undefined
    },
    address: { type: String },
  },
  timings: {
    type: Object as () => { [day: string]: { open: string; close: string; holiday: boolean } },
    default: undefined
  },
  holidays: {
    type: [String],
    default: [],
  },
  categories: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true
});

// Cascade delete products when a store is deleted
StoreSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('Product').deleteMany({ store: doc._id });
  }
});

export default mongoose.model<IStore>('Store', StoreSchema);
