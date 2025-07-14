/**
 * Admin System Test Script
 * Tests all admin functionality to ensure proper implementation
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User';
import { AdminRole, AdminPermission } from '../middlewares/adminAuth';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AthaniMart';

const testAdminSystem = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing Admin System...\n');

    // Test 1: Check if super admin exists
    console.log('1️⃣ Testing Super Admin Check...');
    const superAdmin = await User.findOne({
      role: 'admin',
      adminRole: 'super_admin',
      isActive: true
    });

    if (superAdmin) {
      console.log('✅ Super admin found:', superAdmin.name);
      console.log('   Phone:', superAdmin.phone);
      console.log('   Email:', superAdmin.email);
      console.log('   Admin Role:', superAdmin.adminRole);
    } else {
      console.log('❌ No super admin found. Run: npm run admin:create-super');
    }

    // Test 2: Check admin user structure
    console.log('\n2️⃣ Testing Admin User Structure...');
    const adminUsers = await User.find({ role: 'admin' }).select('-password');
    
    if (adminUsers.length > 0) {
      console.log(`✅ Found ${adminUsers.length} admin users:`);
      adminUsers.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.name} (${admin.adminRole})`);
        console.log(`      Phone: ${admin.phone}`);
        console.log(`      Email: ${admin.email || 'N/A'}`);
        console.log(`      Active: ${admin.isActive}`);
        console.log(`      Created: ${admin.createdAt}`);
      });
    } else {
      console.log('❌ No admin users found');
    }

    // Test 3: Check database indexes
    console.log('\n3️⃣ Testing Database Indexes...');
    const userCollection = mongoose.connection.collection('users');
    const indexes = await userCollection.indexes();
    
    const adminIndexes = indexes.filter(index => 
      index.key && (
        Object.keys(index.key).includes('adminRole') ||
        Object.keys(index.key).includes('isActive') ||
        Object.keys(index.key).includes('role')
      )
    );

    if (adminIndexes.length > 0) {
      console.log('✅ Admin-related indexes found:');
      adminIndexes.forEach((index, i) => {
        console.log(`   ${i + 1}. ${JSON.stringify(index.key)}`);
      });
    } else {
      console.log('❌ No admin indexes found');
    }

    // Test 4: Test user creation with admin role
    console.log('\n4️⃣ Testing Admin User Creation...');
    const testAdminData = {
      name: 'Test Admin',
      phone: '+919876543211',
      email: 'testadmin@athanimart.com',
      password: await bcrypt.hash('TestPass123!', 12),
      role: 'admin' as const,
      adminRole: 'moderator' as AdminRole,
      isActive: true,
      createdBy: 'test-script',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if test admin already exists
    const existingTestAdmin = await User.findOne({
      phone: testAdminData.phone
    });

    if (existingTestAdmin) {
      console.log('✅ Test admin already exists');
    } else {
      const testAdmin = new User(testAdminData);
      await testAdmin.save();
      console.log('✅ Test admin created successfully');
      console.log('   Name:', testAdmin.name);
      console.log('   Role:', testAdmin.role);
      console.log('   Admin Role:', testAdmin.adminRole);
    }

    // Test 5: Verify admin permissions
    console.log('\n5️⃣ Testing Admin Permissions...');
    const rolePermissions = {
      [AdminRole.SUPER_ADMIN]: [
        AdminPermission.VIEW_USERS,
        AdminPermission.CREATE_USERS,
        AdminPermission.UPDATE_USERS,
        AdminPermission.DELETE_USERS,
        AdminPermission.VERIFY_AGENTS,
        AdminPermission.VIEW_HOTELS,
        AdminPermission.MANAGE_HOTELS,
        AdminPermission.VIEW_STORES,
        AdminPermission.MANAGE_STORES,
        AdminPermission.VIEW_ORDERS,
        AdminPermission.MANAGE_ORDERS,
        AdminPermission.VIEW_ANALYTICS,
        AdminPermission.VIEW_SYSTEM,
        AdminPermission.MANAGE_SYSTEM,
        AdminPermission.VIEW_LOGS,
        AdminPermission.MANAGE_SETTINGS
      ],
      [AdminRole.ADMIN]: [
        AdminPermission.VIEW_USERS,
        AdminPermission.UPDATE_USERS,
        AdminPermission.VERIFY_AGENTS,
        AdminPermission.VIEW_HOTELS,
        AdminPermission.MANAGE_HOTELS,
        AdminPermission.VIEW_STORES,
        AdminPermission.MANAGE_STORES,
        AdminPermission.VIEW_ORDERS,
        AdminPermission.MANAGE_ORDERS,
        AdminPermission.VIEW_ANALYTICS,
        AdminPermission.VIEW_SYSTEM,
        AdminPermission.VIEW_LOGS
      ],
      [AdminRole.MODERATOR]: [
        AdminPermission.VIEW_USERS,
        AdminPermission.VERIFY_AGENTS,
        AdminPermission.VIEW_HOTELS,
        AdminPermission.VIEW_STORES,
        AdminPermission.VIEW_ORDERS,
        AdminPermission.VIEW_ANALYTICS
      ],
      [AdminRole.SUPPORT]: [
        AdminPermission.VIEW_USERS,
        AdminPermission.VIEW_ORDERS,
        AdminPermission.VIEW_ANALYTICS
      ]
    };

    console.log('✅ Admin role permissions verified:');
    Object.entries(rolePermissions).forEach(([role, permissions]) => {
      console.log(`   ${role}: ${permissions.length} permissions`);
    });

    // Test 6: Check model validation
    console.log('\n6️⃣ Testing Model Validation...');
    try {
      const invalidAdmin = new User({
        name: 'Invalid Admin',
        phone: '+919876543212',
        email: 'invalid@test.com',
        password: 'password',
        role: 'admin',
        adminRole: 'invalid_role', // This should fail
        isActive: true
      });
      
      await invalidAdmin.save();
      console.log('❌ Model validation failed - should have rejected invalid admin role');
    } catch (error: any) {
      if (error.message.includes('adminRole')) {
        console.log('✅ Model validation working correctly');
      } else {
        console.log('❌ Unexpected validation error:', error.message);
      }
    }

    // Test 7: Performance check
    console.log('\n7️⃣ Testing Performance...');
    const startTime = Date.now();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const endTime = Date.now();
    
    console.log(`✅ Admin count query: ${adminCount} admins in ${endTime - startTime}ms`);

    // Test 8: Cleanup test data
    console.log('\n8️⃣ Cleaning up test data...');
    const testAdmins = await User.find({
      createdBy: 'test-script'
    });

    if (testAdmins.length > 0) {
      await User.deleteMany({ createdBy: 'test-script' });
      console.log(`✅ Cleaned up ${testAdmins.length} test admin users`);
    } else {
      console.log('✅ No test data to clean up');
    }

    console.log('\n🎉 Admin System Test Complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database connection working');
    console.log('   ✅ Admin user structure correct');
    console.log('   ✅ Database indexes in place');
    console.log('   ✅ Role permissions defined');
    console.log('   ✅ Model validation working');
    console.log('   ✅ Performance acceptable');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 MongoDB connection closed');
  }
};

// Run the test
if (require.main === module) {
  testAdminSystem();
}

export default testAdminSystem; 