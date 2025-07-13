import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'customer' | 'hotel_manager' | 'store_owner' | 'delivery_agent' | 'admin';

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support';

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
  // Admin fields
  adminRole?: AdminRole;
  isActive?: boolean;
  lastLoginAt?: Date;
  createdBy?: string; // For admin users
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
  // Admin fields
  adminRole: { type: String, enum: ['super_admin', 'admin', 'moderator', 'support'], default: undefined },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
  createdBy: { type: String }, // For admin users
}, { timestamps: true });

// ========================================
// PRODUCTION DATABASE INDEXES
// ========================================

// Role-based query optimization
UserSchema.index({ role: 1, createdAt: -1 }); // Users by role
UserSchema.index({ role: 1, isOnline: 1 }); // Online users by role

// Delivery agent specific indexes
UserSchema.index({ 
  role: 1, 
  verificationStatus: 1, 
  isOnline: 1 
}); // Available delivery agents

UserSchema.index({ 
  role: 1, 
  verificationStatus: 1, 
  isOnline: 1, 
  lastOnlineAt: -1 
}); // Online verified agents with last activity

UserSchema.index({ 
  driverLicenseNumber: 1 
}, { 
  sparse: true,
  name: 'driver_license_index'
}); // Driver license lookup

UserSchema.index({ 
  vehicleRegistrationNumber: 1 
}, { 
  sparse: true,
  name: 'vehicle_registration_index'
}); // Vehicle registration lookup

// Business owner indexes
UserSchema.index({ 
  role: 1, 
  storeName: 1 
}, { 
  sparse: true,
  name: 'store_owner_index'
}); // Store owners

UserSchema.index({ 
  role: 1, 
  hotelName: 1 
}, { 
  sparse: true,
  name: 'hotel_manager_index'
}); // Hotel managers

// Verification status indexes
UserSchema.index({ 
  verificationStatus: 1, 
  role: 1 
}); // Verification status by role

UserSchema.index({ 
  verificationStatus: 1, 
  createdAt: -1 
}); // Verification requests by date

// Online status tracking
UserSchema.index({ 
  isOnline: 1, 
  lastOnlineAt: -1 
}); // Online users with last activity

UserSchema.index({ 
  role: 1, 
  isOnline: 1, 
  lastOnlineAt: -1 
}); // Online users by role with activity

// Date-based queries
UserSchema.index({ createdAt: -1 }); // User registration date
UserSchema.index({ updatedAt: -1 }); // User update tracking

// Text search for name (if needed)
UserSchema.index({ name: 'text' }, { 
  weights: { name: 10 },
  name: 'user_name_text_index'
});

// Compound indexes for complex queries
UserSchema.index({ 
  role: 1, 
  createdAt: -1, 
  isOnline: 1 
}); // Role-based user analytics

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
