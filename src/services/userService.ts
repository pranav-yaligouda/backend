import User from '../models/User';
import bcrypt from 'bcryptjs';

export interface CreateUserInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: 'customer' | 'hotel_manager' | 'store_owner' | 'delivery_agent' | 'admin';
  storeName?: string;
  hotelName?: string;
}

export async function createUser(input: CreateUserInput) {
  const { name, phone, email, password, role, storeName, hotelName } = input;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, phone, email, password: hashedPassword, role, storeName, hotelName });
  await user.save();
  return user;
}

export async function findUserByPhone(phone: string) {
  return User.findOne({ phone });
}

export async function findUserByPhoneOrEmail(phone: string, email?: string) {
  if (email) {
    return User.findOne({ $or: [ { phone }, { email } ] });
  }
  return User.findOne({ phone });
}
