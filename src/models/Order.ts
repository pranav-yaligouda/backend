import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED_BY_VENDOR'
  | 'ACCEPTED_BY_AGENT'
  | 'PICKED_UP'
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
    city: string;
    state: string;
    pincode: string;
    coordinates?: { lat: number; lng: number };
  };
  pickupAddress: {
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: { lat: number; lng: number };
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  type: { type: String, enum: ['dish', 'product'], required: true },
  itemId: { type: Schema.Types.ObjectId, required: true, refPath: 'items.type' },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const AddressSchema = {
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
};

const OrderSchema = new Schema<IOrder>({
  businessType: { type: String, enum: ['hotel', 'store'], required: true },
  businessId: { type: Schema.Types.ObjectId, required: true, refPath: 'businessType' },
  items: { type: [OrderItemSchema], required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deliveryAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['PLACED', 'ACCEPTED_BY_VENDOR', 'ACCEPTED_BY_AGENT', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'REJECTED'],
    default: 'PLACED',
    required: true,
  },
  deliveryAddress: { type: AddressSchema, required: true },
  pickupAddress: { type: AddressSchema, required: true },
  notes: { type: String },
}, { timestamps: true });

const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order; 