import mongoose from 'mongoose';
import { connectDB } from '../config/mongoose';

/**
 * Ensure All Indexes Script for AthaniMart
 * 
 * This script ensures all necessary indexes are created before running performance tests
 */

class IndexEnsurer {
  private isConnected = false;

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Ensuring All Database Indexes...');
      await connectDB();
      this.isConnected = true;
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      process.exit(1);
    }
  }

  /**
   * Ensure all indexes are created
   */
  async ensureAllIndexes(): Promise<void> {
    console.log('\n🔧 Creating All Required Indexes...');

    try {
      // Get all collections
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        const collectionName = collection.name;
        console.log(`   Ensuring indexes for: ${collectionName}`);
        
        await this.ensureIndexesForCollection(collectionName);
      }

      console.log('✅ All indexes ensured successfully');
    } catch (error) {
      console.error('❌ Error ensuring indexes:', error);
    }
  }

  /**
   * Ensure indexes for a specific collection
   */
  private async ensureIndexesForCollection(collectionName: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    const collection = db.collection(collectionName);

    switch (collectionName) {
      case 'orders':
        await this.ensureOrderIndexes(collection);
        break;
      case 'users':
        await this.ensureUserIndexes(collection);
        break;
      case 'storeproducts':
        await this.ensureStoreProductIndexes(collection);
        break;
      case 'stores':
        await this.ensureStoreIndexes(collection);
        break;
      case 'hotels':
        await this.ensureHotelIndexes(collection);
        break;
      case 'dishes':
        await this.ensureDishIndexes(collection);
        break;
      case 'products':
        await this.ensureProductIndexes(collection);
        break;
      default:
        console.log(`   No specific indexes for: ${collectionName}`);
    }
  }

  /**
   * Ensure Order indexes
   */
  private async ensureOrderIndexes(collection: any): Promise<void> {
    const indexes = [
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
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, { 
          background: true,
          ...(index.sparse && { sparse: true }),
          ...(index.weights && { weights: index.weights })
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`     Index already exists or error: ${errorMessage}`);
      }
    }
  }

  /**
   * Ensure User indexes
   */
  private async ensureUserIndexes(collection: any): Promise<void> {
    const indexes = [
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
      { key: { role: 1, createdAt: -1, isOnline: 1 } }
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, { 
          background: true,
          ...(index.sparse && { sparse: true }),
          ...(index.weights && { weights: index.weights })
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`     Index already exists or error: ${errorMessage}`);
      }
    }
  }

  /**
   * Ensure StoreProduct indexes
   */
  private async ensureStoreProductIndexes(collection: any): Promise<void> {
    const indexes = [
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
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, { background: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`     Index already exists or error: ${errorMessage}`);
      }
    }
  }

  /**
   * Ensure Store indexes
   */
  private async ensureStoreIndexes(collection: any): Promise<void> {
    const indexes = [
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
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, { 
          background: true,
          ...(index.sparse && { sparse: true }),
          ...(index.weights && { weights: index.weights })
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`     Index already exists or error: ${errorMessage}`);
      }
    }
  }

  /**
   * Ensure Hotel indexes
   */
  private async ensureHotelIndexes(collection: any): Promise<void> {
    const indexes = [
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
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, { 
          background: true,
          ...(index.sparse && { sparse: true }),
          ...(index.weights && { weights: index.weights })
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`     Index already exists or error: ${errorMessage}`);
      }
    }
  }

  /**
   * Ensure Dish indexes
   */
  private async ensureDishIndexes(collection: any): Promise<void> {
    const indexes = [
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
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, { 
          background: true,
          ...(index.weights && { weights: index.weights })
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`     Index already exists or error: ${errorMessage}`);
      }
    }
  }

  /**
   * Ensure Product indexes
   */
  private async ensureProductIndexes(collection: any): Promise<void> {
    const indexes = [
      { key: { category: 1, available: 1 } },
      { key: { category: 1, isDeleted: 1 } },
      { key: { category: 1, createdAt: -1 } },
      { key: { available: 1 } },
      { key: { available: 1, category: 1 } },
      { key: { available: 1, isDeleted: 1 } },
      { key: { isDeleted: 1 } },
      { key: { isDeleted: 1, category: 1 } },
      { key: { isDeleted: 1, available: 1 } },
      { key: { name: 1 } },
      { key: { name: 'text', description: 'text' }, weights: { name: 10, description: 5 } },
      { key: { createdAt: -1 } },
      { key: { updatedAt: -1 } },
      { key: { category: 1, available: 1, isDeleted: 1 } },
      { key: { available: 1, isDeleted: 1, category: 1 } },
      { key: { name: 1, category: 1, available: 1 } },
      { key: { category: 1, available: 1, createdAt: -1 } },
      { key: { available: 1, isDeleted: 1, createdAt: -1 } }
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, { 
          background: true,
          ...(index.weights && { weights: index.weights })
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`     Index already exists or error: ${errorMessage}`);
      }
    }
  }

  /**
   * Cleanup and close connection
   */
  async cleanup(): Promise<void> {
    if (this.isConnected) {
      await mongoose.connection.close();
      console.log('🔒 Database connection closed');
    }
  }
}

/**
 * Main function
 */
async function main() {
  const ensurer = new IndexEnsurer();
  
  try {
    await ensurer.initialize();
    await ensurer.ensureAllIndexes();
    console.log('\n✅ All indexes ensured successfully!');
  } catch (error) {
    console.error('❌ Error ensuring indexes:', error);
    process.exit(1);
  } finally {
    await ensurer.cleanup();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export default IndexEnsurer; 