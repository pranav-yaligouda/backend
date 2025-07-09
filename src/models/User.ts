import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'customer' | 'hotel_manager' | 'store_owner' | 'delivery_agent' | 'admin';

export interface IUser extends Document {
  name: string;
  phone: string; // required, unique
  email?: string; // optional, unique
  password: string;
  role: UserRole;
  storeName?: string; // for store_owner
  hotelName?: string; // for hotel_manager
  // Delivery agent fields
  driverLicenseNumber?: string;
  vehicleRegistrationNumber?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  isOnline?: boolean;
  lastOnlineAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema<IUser>({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true }, // optional, unique
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'hotel_manager', 'store_owner', 'delivery_agent', 'admin'], required: true },
  storeName: { type: String }, // only for store_owner
  hotelName: { type: String }, // only for hotel_manager
  // Delivery agent fields
  driverLicenseNumber: { type: String },
  vehicleRegistrationNumber: { type: String },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: undefined },
  isOnline: { type: Boolean, default: false },
  lastOnlineAt: { type: Date },
}, { timestamps: true });

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
