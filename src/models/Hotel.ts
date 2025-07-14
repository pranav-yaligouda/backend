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

// ========================================
// PRODUCTION DATABASE INDEXES
// ========================================

// Hotel discovery and search indexes
HotelSchema.index({ name: 1 }); // Hotel name lookup
HotelSchema.index({ name: 'text' }, { 
  weights: { name: 10, 'location.address': 5 },
  name: 'hotel_search_text'
}); // Text search for hotel discovery

// Location-based indexes (geospatial)
HotelSchema.index({ 
  location: '2dsphere' 
}, { 
  sparse: true,
  name: 'hotel_location_geospatial'
}); // Geospatial queries for nearby hotels

HotelSchema.index({ 
  'location.coordinates': '2dsphere' 
}, { 
  sparse: true,
  name: 'hotel_coordinates_geospatial'
}); // Direct coordinate queries

// Address-based queries
HotelSchema.index({ 'location.address': 1 }); // Address lookup
HotelSchema.index({ 'location.address': 'text' }, { 
  weights: { 'location.address': 10 },
  name: 'hotel_address_text'
}); // Address text search

// Holiday-based queries (for availability)
HotelSchema.index({ holidays: 1 }); // Hotels by holiday dates
HotelSchema.index({ holidays: 1, name: 1 }); // Holiday hotels with name

// Compound indexes for complex queries
HotelSchema.index({ 
  name: 1, 
  'location.address': 1 
}); // Hotel search with location

// Performance optimization for aggregation queries
HotelSchema.index({ 
  name: 1, 
  location: '2dsphere' 
}, { 
  sparse: true,
  name: 'hotel_name_location_geospatial'
}); // Name-based geospatial queries

// Cascade delete dishes when a hotel is deleted
HotelSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('Dish').deleteMany({ hotel: doc._id });
  }
});

export default mongoose.model<IHotel>('Hotel', HotelSchema);
