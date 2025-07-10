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

/**
 * Order Status Flow:
 * PLACED -> ACCEPTED_BY_VENDOR -> PREPARING -> READY_FOR_PICKUP -> ACCEPTED_BY_AGENT -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
 * Only vendors can move through PLACED, ACCEPTED_BY_VENDOR, PREPARING, READY_FOR_PICKUP.
 * Only agents can move through ACCEPTED_BY_AGENT, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED.
 * deliveryAgentId is set only at ACCEPTED_BY_AGENT.
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
  deliveryAddress: { type: AddressSchema, required: true },
  pickupAddress: { type: pickupAddressSchema, required: true },
  paymentMethod: { type: String, enum: ['cod', 'online'], required: true, default: 'cod' },
  notes: { type: String },
}, { timestamps: true });

const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order; 