import mongoose, { Document, Schema } from 'mongoose';

export interface IHotel extends Document {
  name: string;
  manager: mongoose.Types.ObjectId; // reference to User
  image?: string;
  timings?: {
    [day: string]: { open: string; close: string; holiday: boolean };
  };
  holidays?: string[]; // ISO date strings
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address?: string;
  };
}

const HotelSchema = new Schema<IHotel>({
  name: { type: String, required: true },
  manager: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // one hotel per manager
  image: { type: String },
  timings: {
    type: Object as () => { [day: string]: { open: string; close: string; holiday: boolean } },
    default: undefined
  },
  holidays: {
    type: [String], // ISO date strings
    default: [],
  },
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
});

// Cascade delete dishes when a hotel is deleted
HotelSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('Dish').deleteMany({ hotel: doc._id });
  }
});

export default mongoose.model<IHotel>('Hotel', HotelSchema);
