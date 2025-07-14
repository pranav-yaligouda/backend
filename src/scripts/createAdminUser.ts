/**
 * Create Initial Super Admin User
 * This script creates the first super admin user for the AthaniMart platform
 * Run this script once during initial setup
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AthaniMart';

interface SuperAdminData {
  name: string;
  phone: string;
  email: string;
  password: string;
  adminRole: 'super_admin';
}

const createSuperAdmin = async (adminData: SuperAdminData) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({
      role: 'admin',
      adminRole: 'super_admin',
      isActive: true
    });

    if (existingSuperAdmin) {
      console.log('❌ Super admin already exists:', existingSuperAdmin.name);
      console.log('   Phone:', existingSuperAdmin.phone);
      console.log('   Email:', existingSuperAdmin.email);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Create super admin user
    const superAdmin = new User({
      name: adminData.name,
      phone: adminData.phone,
      email: adminData.email,
      password: hashedPassword,
      role: 'admin',
      adminRole: 'super_admin',
      isActive: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await superAdmin.save();

    console.log('✅ Super admin created successfully!');
    console.log('📋 Admin Details:');
    console.log('   Name:', superAdmin.name);
    console.log('   Phone:', superAdmin.phone);
    console.log('   Email:', superAdmin.email);
    console.log('   Role:', superAdmin.role);
    console.log('   Admin Role:', superAdmin.adminRole);
    console.log('   ID:', superAdmin._id);
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log('   Phone:', adminData.phone);
    console.log('   Password:', adminData.password);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('⚠️  Store these credentials securely!');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed');
  }
};

// Default super admin data (modify as needed)
const defaultSuperAdmin: SuperAdminData = {
  name: 'Super Administrator',
  phone: '+919876543210', // Change this to your phone number
  email: 'admin@athanimart.com', // Change this to your email
  password: 'Admin@123456', // Change this to a strong password
  adminRole: 'super_admin'
};

// Run the script
if (require.main === module) {
  console.log('🚀 Creating Super Admin User...');
  console.log('📝 Using default credentials (modify in script if needed):');
  console.log('   Phone:', defaultSuperAdmin.phone);
  console.log('   Email:', defaultSuperAdmin.email);
  console.log('   Password:', defaultSuperAdmin.password);
  console.log('');

  createSuperAdmin(defaultSuperAdmin);
}

export default createSuperAdmin; 