import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AthaniMart';

// Production-ready MongoDB connection options
const connectionOptions = {
  // Connection pool settings
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Maximum time a connection can remain idle
  
  // Server selection and timeout settings
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout for operations
  connectTimeoutMS: 10000, // Connection timeout
  
  // Write concern and read preference
  w: 'majority' as const, // Write concern for data durability
  readPreference: 'secondaryPreferred' as const, // Read from secondary if available
  
  // Retry settings
  retryWrites: true, // Retry write operations on failure
  retryReads: true,  // Retry read operations on failure
  
  // Buffer settings
  bufferCommands: false, // Disable command buffering
  
  // Authentication and security
  authSource: 'admin', // Authentication database
  
  // Monitoring and logging
  monitorCommands: process.env.NODE_ENV === 'development', // Log commands in development
};

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, connectionOptions);
    console.log('✅ Connected to MongoDB with production optimizations');
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.info('🔄 MongoDB reconnected');
    });
    
    mongoose.connection.on('close', () => {
      console.warn('🔒 MongoDB connection closed');
    });
    
    // Monitor connection pool
    mongoose.connection.on('connected', () => {
      console.info('📊 MongoDB connection established');
    });
    
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  }
};

// Database optimization utilities
export const optimizeDatabase = async () => {
  try {
    if (!mongoose.connection.db) {
      console.error('❌ Database not connected');
      return;
    }
    
    console.log('🔧 Creating database indexes...');
    
    // Create indexes for all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`   Creating indexes for collection: ${collectionName}`);
      
      // Create indexes based on collection type
      switch (collectionName) {
        case 'orders':
          await mongoose.connection.db.collection(collectionName).createIndexes([
            { key: { customerId: 1, createdAt: -1 } },
            { key: { businessId: 1, status: 1, createdAt: -1 } },
            { key: { deliveryAgentId: 1, status: 1, createdAt: -1 } },
            { key: { status: 1, createdAt: -1 } },
            { key: { businessType: 1, businessId: 1, status: 1 } },
            { key: { businessType: 1, status: 1, createdAt: -1 } },
            { key: { createdAt: -1 } },
            { key: { updatedAt: -1 } },
            { key: { status: 1, businessId: 1 } },
            { key: { status: 1, deliveryAgentId: 1 } },
            { key: { paymentMethod: 1, createdAt: -1 } },
            { key: { verificationPin: 1 }, sparse: true },
            { key: { businessType: 1, businessId: 1, status: 1, createdAt: -1 } },
            { key: { customerId: 1, status: 1, createdAt: -1 } },
            { key: { deliveryAgentId: 1, status: 1, createdAt: -1 } },
            { key: { notes: 'text' }, weights: { notes: 10 } },
            { key: { 'deliveryAddress.coordinates': '2dsphere' }, sparse: true },
            { key: { 'pickupAddress.coordinates': '2dsphere' }, sparse: true }
          ]);
          break;
          
        case 'users':
          await mongoose.connection.db.collection(collectionName).createIndexes([
            { key: { role: 1, createdAt: -1 } },
            { key: { role: 1, isOnline: 1 } },
            { key: { role: 1, verificationStatus: 1, isOnline: 1 } },
            { key: { role: 1, verificationStatus: 1, isOnline: 1, lastOnlineAt: -1 } },
            { key: { driverLicenseNumber: 1 }, sparse: true },
            { key: { vehicleRegistrationNumber: 1 }, sparse: true },
            { key: { role: 1, storeName: 1 }, sparse: true },
            { key: { role: 1, hotelName: 1 }, sparse: true },
            { key: { verificationStatus: 1, role: 1 } },
            { key: { verificationStatus: 1, createdAt: -1 } },
            { key: { isOnline: 1, lastOnlineAt: -1 } },
            { key: { role: 1, isOnline: 1, lastOnlineAt: -1 } },
            { key: { createdAt: -1 } },
            { key: { updatedAt: -1 } },
            { key: { name: 'text' }, weights: { name: 10 } },
            { key: { role: 1, verificationStatus: 1, isOnline: 1, lastOnlineAt: -1 } },
            { key: { role: 1, createdAt: -1, isOnline: 1 } }
          ]);
          break;
          
        case 'storeproducts':
          await mongoose.connection.db.collection(collectionName).createIndexes([
            { key: { storeId: 1, quantity: 1 } },
            { key: { storeId: 1, price: 1 } },
            { key: { storeId: 1, createdAt: -1 } },
            { key: { productId: 1, quantity: 1 } },
            { key: { productId: 1, price: 1 } },
            { key: { productId: 1, storeId: 1 } },
            { key: { quantity: 1 } },
            { key: { quantity: 1, storeId: 1 } },
            { key: { price: 1 } },
            { key: { price: 1, storeId: 1 } },
            { key: { price: 1, productId: 1 } },
            { key: { createdAt: -1 } },
            { key: { updatedAt: -1 } },
            { key: { storeId: 1, updatedAt: -1 } },
            { key: { storeId: 1, quantity: 1, price: 1 } },
            { key: { productId: 1, quantity: 1, price: 1 } },
            { key: { storeId: 1, quantity: 1, createdAt: -1 } },
            { key: { productId: 1, quantity: 1, createdAt: -1 } }
          ]);
          break;
          
        case 'stores':
          await mongoose.connection.db.collection(collectionName).createIndexes([
            { key: { name: 1 } },
            { key: { name: 'text', address: 'text' }, weights: { name: 10, address: 5 } },
            { key: { categories: 1 } },
            { key: { categories: 1, name: 1 } },
            { key: { location: '2dsphere' }, sparse: true },
            { key: { 'location.coordinates': '2dsphere' }, sparse: true },
            { key: { address: 1 } },
            { key: { address: 'text' }, weights: { address: 10 } },
            { key: { createdAt: -1 } },
            { key: { updatedAt: -1 } },
            { key: { owner: 1, createdAt: -1 } },
            { key: { owner: 1, updatedAt: -1 } },
            { key: { categories: 1, name: 1, createdAt: -1 } },
            { key: { name: 1, address: 1, categories: 1 } },
            { key: { owner: 1, categories: 1, createdAt: -1 } },
            { key: { categories: 1, location: '2dsphere' }, sparse: true }
          ]);
          break;
          
        case 'hotels':
          await mongoose.connection.db.collection(collectionName).createIndexes([
            { key: { name: 1 } },
            { key: { name: 'text', 'location.address': 'text' }, weights: { name: 10, 'location.address': 5 } },
            { key: { location: '2dsphere' }, sparse: true },
            { key: { 'location.coordinates': '2dsphere' }, sparse: true },
            { key: { 'location.address': 1 } },
            { key: { 'location.address': 'text' }, weights: { 'location.address': 10 } },
            { key: { manager: 1, name: 1 } },
            { key: { holidays: 1 } },
            { key: { holidays: 1, name: 1 } },
            { key: { name: 1, 'location.address': 1 } },
            { key: { manager: 1, name: 1, 'location.address': 1 } },
            { key: { manager: 1, name: 1 } },
            { key: { name: 1, location: '2dsphere' }, sparse: true }
          ]);
          break;
          
        case 'dishes':
          await mongoose.connection.db.collection(collectionName).createIndexes([
            { key: { hotel: 1, available: 1 } },
            { key: { hotel: 1, category: 1 } },
            { key: { hotel: 1, mealType: 1 } },
            { key: { hotel: 1, cuisineType: 1 } },
            { key: { hotel: 1, price: 1 } },
            { key: { hotel: 1, createdAt: -1 } },
            { key: { available: 1 } },
            { key: { available: 1, hotel: 1 } },
            { key: { available: 1, category: 1 } },
            { key: { category: 1, available: 1 } },
            { key: { category: 1, price: 1 } },
            { key: { category: 1, hotel: 1 } },
            { key: { mealType: 1, available: 1 } },
            { key: { mealType: 1, hotel: 1 } },
            { key: { mealType: 1, category: 1 } },
            { key: { cuisineType: 1, available: 1 } },
            { key: { cuisineType: 1, hotel: 1 } },
            { key: { cuisineType: 1, category: 1 } },
            { key: { price: 1 } },
            { key: { price: 1, available: 1 } },
            { key: { price: 1, hotel: 1 } },
            { key: { price: 1, category: 1 } },
            { key: { dietaryTags: 1 } },
            { key: { dietaryTags: 1, available: 1 } },
            { key: { dietaryTags: 1, hotel: 1 } },
            { key: { name: 1 } },
            { key: { dishName: 1 } },
            { key: { name: 'text', description: 'text' }, weights: { name: 10, description: 5 } },
            { key: { createdAt: -1 } },
            { key: { updatedAt: -1 } },
            { key: { hotel: 1, createdAt: -1 } },
            { key: { hotel: 1, available: 1, category: 1, price: 1 } },
            { key: { hotel: 1, available: 1, mealType: 1, cuisineType: 1 } },
            { key: { category: 1, available: 1, price: 1, hotel: 1 } },
            { key: { mealType: 1, available: 1, category: 1, hotel: 1 } },
            { key: { hotel: 1, available: 1, createdAt: -1 } },
            { key: { category: 1, available: 1, createdAt: -1 } },
            { key: { price: 1, available: 1, hotel: 1 } }
          ]);
          break;
          
        case 'products':
          await mongoose.connection.db.collection(collectionName).createIndexes([
            { key: { category: 1, available: 1 } },
            { key: { category: 1, isDeleted: 1 } },
            { key: { category: 1, createdAt: -1 } },
            { key: { available: 1 } },
            { key: { available: 1, category: 1 } },
            { key: { available: 1, isDeleted: 1 } },
            { key: { isDeleted: 1 } },
            { key: { isDeleted: 1, category: 1 } },
            { key: { isDeleted: 1, available: 1 } },
            { key: { unit: 1 } },
            { key: { unit: 1, category: 1 } },
            { key: { unit: 1, available: 1 } },
            { key: { name: 1 } },
            { key: { name: 'text', description: 'text' }, weights: { name: 10, description: 5 } },
            { key: { createdAt: -1 } },
            { key: { updatedAt: -1 } },
            { key: { category: 1, createdAt: -1 } },
            { key: { category: 1, available: 1, isDeleted: 1 } },
            { key: { available: 1, isDeleted: 1, category: 1 } },
            { key: { category: 1, unit: 1, available: 1 } },
            { key: { name: 1, category: 1, available: 1 } },
            { key: { category: 1, available: 1, createdAt: -1 } },
            { key: { unit: 1, available: 1, category: 1 } },
            { key: { isDeleted: 1, createdAt: -1 } }
          ]);
          break;
      }
    }
    
    console.log('✅ Database indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
  }
};

// Database performance monitoring
export const monitorDatabasePerformance = async () => {
  try {
    if (!mongoose.connection.db) {
      console.error('❌ Database not connected');
      return;
    }
    
    // Monitor slow queries
    await mongoose.connection.db.admin().command({
      profile: 2, // Enable profiling for all operations
      slowms: 100 // Log operations slower than 100ms
    });
    
    console.log('📊 Database performance monitoring enabled');
  } catch (error) {
    console.error('❌ Error enabling database monitoring:', error);
  }
};

// Database cleanup utilities
export const cleanupDatabase = async () => {
  try {
    if (!mongoose.connection.db) {
      console.error('❌ Database not connected');
      return;
    }
    
    // Clean up soft-deleted products older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await mongoose.connection.db.collection('products').deleteMany({
      isDeleted: true,
      updatedAt: { $lt: thirtyDaysAgo }
    });
    
    console.log(`🧹 Cleaned up ${result.deletedCount} soft-deleted products`);
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  }
};
