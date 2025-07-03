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
}, { timestamps: true });

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
