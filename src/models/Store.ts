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

// ========================================
// PRODUCTION DATABASE INDEXES
// ========================================

// Store discovery and search indexes
StoreSchema.index({ name: 1 }); // Store name lookup
StoreSchema.index({ name: 'text', address: 'text' }, { 
  weights: { name: 10, address: 5 },
  name: 'store_search_text'
}); // Text search for store discovery

// Category-based query optimization
StoreSchema.index({ categories: 1 }); // Stores by category
StoreSchema.index({ categories: 1, name: 1 }); // Category with name

// Location-based indexes (geospatial)
StoreSchema.index({ 
  location: '2dsphere' 
}, { 
  sparse: true,
  name: 'store_location_geospatial'
}); // Geospatial queries for nearby stores

StoreSchema.index({ 
  'location.coordinates': '2dsphere' 
}, { 
  sparse: true,
  name: 'store_coordinates_geospatial'
}); // Direct coordinate queries

// Address-based queries
StoreSchema.index({ address: 1 }); // Address lookup
StoreSchema.index({ address: 'text' }, { 
  weights: { address: 10 },
  name: 'store_address_text'
}); // Address text search

// Date-based queries
StoreSchema.index({ createdAt: -1 }); // Recently created stores
StoreSchema.index({ updatedAt: -1 }); // Recently updated stores

// Owner-based queries
StoreSchema.index({ owner: 1, createdAt: -1 }); // Owner's store with creation date
StoreSchema.index({ owner: 1, updatedAt: -1 }); // Owner's store with update date

// Compound indexes for complex queries
StoreSchema.index({ 
  categories: 1, 
  name: 1, 
  createdAt: -1 
}); // Category stores with name and date

StoreSchema.index({ 
  name: 1, 
  address: 1, 
  categories: 1 
}); // Store search with multiple criteria

// Performance optimization for aggregation queries
StoreSchema.index({ 
  owner: 1, 
  categories: 1, 
  createdAt: -1 
}); // Owner's stores by category

StoreSchema.index({ 
  categories: 1, 
  location: '2dsphere' 
}, { 
  sparse: true,
  name: 'category_location_geospatial'
}); // Category-based geospatial queries

// Cascade delete products when a store is deleted
StoreSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('Product').deleteMany({ store: doc._id });
  }
});

export default mongoose.model<IStore>('Store', StoreSchema);
