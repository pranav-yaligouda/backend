import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED_BY_VENDOR'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'ACCEPTED_BY_AGENT'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export type BusinessType = 'hotel' | 'store';

export interface IOrderItem {
  type: 'dish' | 'product';
  itemId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  businessType: BusinessType;
  businessId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  customerId: mongoose.Types.ObjectId;
  deliveryAgentId?: mongoose.Types.ObjectId;
  status: OrderStatus;
  verificationPin?: string; // PIN for pickup verification
  optimizedRoute?: {
    storePickups: Array<{
      storeId: mongoose.Types.ObjectId;
      storeName: string;
      location: { lat: number; lng: number };
      items: mongoose.Types.ObjectId[];
    }>;
    customerDropoff: {
      address: string;
      location: { lat: number; lng: number };
    };
    estimatedDistance?: number;
    estimatedDuration?: number;
  };
  deliveryAddress: {
    addressLine: string;
    coordinates: { lat: number; lng: number };
  };
  pickupAddress: {
    addressLine: string;
    coordinates: { lat: number; lng: number };
  };
  paymentMethod: 'cod' | 'online';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  type: { type: String, enum: ['dish', 'product'], required: true },
  itemId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const AddressSchema = new Schema({
  addressLine: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
});

const StorePickupSchema = new Schema({
  storeId: { type: Schema.Types.ObjectId, required: true },
  storeName: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  items: [{ type: Schema.Types.ObjectId }],
}, { _id: false });

const CustomerDropoffSchema = new Schema({
  address: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
}, { _id: false });

const OptimizedRouteSchema = new Schema({
  storePickups: [StorePickupSchema],
  customerDropoff: CustomerDropoffSchema,
  estimatedDistance: { type: Number },
  estimatedDuration: { type: Number },
}, { _id: false });

/**
 * Order Status Flow:
 * PLACED -> ACCEPTED_BY_VENDOR -> PREPARING -> READY_FOR_PICKUP -> ACCEPTED_BY_AGENT -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
 * Only vendors can move through PLACED, ACCEPTED_BY_VENDOR, PREPARING, READY_FOR_PICKUP.
 * Only agents can move through ACCEPTED_BY_AGENT, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED.
 * deliveryAgentId is set only at ACCEPTED_BY_AGENT.
 * verificationPin is generated when order reaches READY_FOR_PICKUP and used for pickup verification.
 * pickupAddress: { addressLine: string, coordinates: { lat: number, lng: number } }
 */
const pickupAddressSchema = new Schema({
  addressLine: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  businessType: { type: String, enum: ['hotel', 'store'], required: true },
  businessId: { type: Schema.Types.ObjectId, required: true },
  items: { type: [OrderItemSchema], required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deliveryAgentId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: [
      'PLACED',
      'ACCEPTED_BY_VENDOR',
      'PREPARING',
      'READY_FOR_PICKUP',
      'ACCEPTED_BY_AGENT',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'REJECTED'
    ],
    default: 'PLACED'
  },
  verificationPin: { type: String, default: null }, // PIN for pickup verification
  optimizedRoute: { type: OptimizedRouteSchema, default: null },
  deliveryAddress: { type: AddressSchema, required: true },
  pickupAddress: { type: pickupAddressSchema, required: true },
  paymentMethod: { type: String, enum: ['cod', 'online'], required: true, default: 'cod' },
  notes: { type: String },
}, { timestamps: true });

// Generate verification PIN when order reaches READY_FOR_PICKUP
OrderSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'READY_FOR_PICKUP' && !this.verificationPin) {
    // Generate a 4-digit PIN
    this.verificationPin = Math.floor(1000 + Math.random() * 9000).toString();
  }
  next();
});

// ========================================
// PRODUCTION DATABASE INDEXES
// ========================================

// Primary query indexes for order retrieval
OrderSchema.index({ customerId: 1, createdAt: -1 }); // Customer order history
OrderSchema.index({ businessId: 1, status: 1, createdAt: -1 }); // Vendor order management
OrderSchema.index({ status: 1, createdAt: -1 }); // Order status tracking

// Business type specific indexes
OrderSchema.index({ businessType: 1, businessId: 1, status: 1 }); // Business-specific orders
OrderSchema.index({ businessType: 1, status: 1, createdAt: -1 }); // Business type filtering

// Date range query optimization
OrderSchema.index({ createdAt: -1 }); // General date sorting
OrderSchema.index({ updatedAt: -1 }); // Update tracking

// Status-specific indexes for common queries
OrderSchema.index({ status: 1, businessId: 1 }); // Status by business

// Payment method indexing
OrderSchema.index({ paymentMethod: 1, createdAt: -1 }); // Payment analytics

// Verification PIN indexing (for pickup verification)
OrderSchema.index({ verificationPin: 1 }, { sparse: true }); // PIN lookup

// Compound indexes for complex queries
OrderSchema.index({ 
  businessType: 1, 
  businessId: 1, 
  status: 1, 
  createdAt: -1 
}); // Business orders with status and date

OrderSchema.index({ 
  customerId: 1, 
  status: 1, 
  createdAt: -1 
}); // Customer orders with status and date

// Text search index for notes (if needed)
OrderSchema.index({ notes: 'text' }, { 
  weights: { notes: 10 },
  name: 'order_notes_text_index'
});

// Geospatial index for delivery optimization (if using geospatial queries)
OrderSchema.index({ 
  'deliveryAddress.coordinates': '2dsphere' 
}, { 
  sparse: true,
  name: 'delivery_address_geospatial'
});

OrderSchema.index({ 
  'pickupAddress.coordinates': '2dsphere' 
}, { 
  sparse: true,
  name: 'pickup_address_geospatial'
});

const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order; 