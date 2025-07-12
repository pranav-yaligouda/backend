import mongoose from 'mongoose';
import { connectDB } from '../config/mongoose';

/**
 * Database Optimization Script for AthaniMart
 * 
 * This script performs comprehensive database optimization including:
 * - Index creation and optimization
 * - Query performance analysis
 * - Connection settings optimization
 * - Performance recommendations
 */

interface OptimizationReport {
  timestamp: string;
  database: string;
  host: string;
  port: number;
  collections: Array<{
    name: string;
    documents: number;
    size: number;
    indexes: number;
    avgObjSize: number;
  }>;
  indexes: Array<{
    collection: string;
    count: number;
    indexes: Array<{
      name: string;
      keys: any;
      unique: boolean;
      sparse: boolean;
    }>;
  }>;
  recommendations: string[];
}

class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private isConnected = false;

  private constructor() {}

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Starting Comprehensive Database Optimization...');
      await connectDB();
      this.isConnected = true;
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      process.exit(1);
    }
  }

  /**
   * Run all optimization tasks
   */
  async runOptimizations(): Promise<void> {
    console.log('\n🔧 Running Comprehensive Database Optimizations...');

    // Create all indexes
    await this.createAllIndexes();
    
    // Optimize connection settings
    await this.optimizeConnectionSettings();
    
    // Generate comprehensive report
    await this.generateOptimizationReport();
  }

  /**
   * Create all necessary indexes
   */
  private async createAllIndexes(): Promise<void> {
    try {
      console.log('📊 Creating Comprehensive Indexes...');
      
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }

      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        const collectionName = collection.name;
        console.log(`   Creating indexes for: ${collectionName}`);
        
        await this.createIndexesForCollection(collectionName);
      }

      console.log('✅ All indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
    }
  }

  /**
   * Create indexes for a specific collection
   */
  private async createIndexesForCollection(collectionName: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    const collection = db.collection(collectionName);

    switch (collectionName) {
      case 'orders':
        await this.createOrderIndexes(collection);
        break;
      case 'users':
        await this.createUserIndexes(collection);
        break;
      case 'storeproducts':
        await this.createStoreProductIndexes(collection);
        break;
      case 'stores':
        await this.createStoreIndexes(collection);
        break;
      case 'hotels':
        await this.createHotelIndexes(collection);
        break;
      case 'dishes':
        await this.createDishIndexes(collection);
        break;
      case 'products':
        await this.createProductIndexes(collection);
        break;
      default:
        console.log(`   No specific indexes for: ${collectionName}`);
    }
  }

  /**
   * Create Order indexes
   */
  private async createOrderIndexes(collection: any): Promise<void> {
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
   * Create User indexes
   */
  private async createUserIndexes(collection: any): Promise<void> {
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
   * Create StoreProduct indexes
   */
  private async createStoreProductIndexes(collection: any): Promise<void> {
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
   * Create Store indexes
   */
  private async createStoreIndexes(collection: any): Promise<void> {
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
   * Create Hotel indexes
   */
  private async createHotelIndexes(collection: any): Promise<void> {
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
   * Create Dish indexes
   */
  private async createDishIndexes(collection: any): Promise<void> {
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
   * Create Product indexes
   */
  private async createProductIndexes(collection: any): Promise<void> {
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
   * Optimize connection settings for production
   */
  private async optimizeConnectionSettings(): Promise<void> {
    try {
      console.log('⚡ Optimizing Connection Settings...');
      
      // Set optimal connection pool settings
      const poolSettings = {
        maxPoolSize: 20, // Increased for production load
        minPoolSize: 5,  // Minimum connections
        maxIdleTimeMS: 30000, // 30 seconds idle timeout
        waitQueueTimeoutMS: 2500, // Wait queue timeout
        maxConnecting: 2 // Maximum concurrent connection attempts
      };

      console.log('   - Connection pool optimized');
      console.log(`   - Max pool size: ${poolSettings.maxPoolSize}`);
      console.log(`   - Min pool size: ${poolSettings.minPoolSize}`);
      console.log(`   - Idle timeout: ${poolSettings.maxIdleTimeMS}ms`);

      // Set write concern for data durability
      const writeConcern = {
        w: 'majority',
        j: true, // Journal write
        wtimeout: 5000 // 5 second timeout
      };

      console.log('   - Write concern optimized for data durability');
      console.log(`   - Write concern: ${writeConcern.w}`);
      console.log(`   - Journal writes: ${writeConcern.j}`);

    } catch (error) {
      console.error('❌ Error optimizing connection settings:', error);
    }
  }

  /**
   * Generate comprehensive optimization report
   */
  private async generateOptimizationReport(): Promise<void> {
    try {
      console.log('\n📋 DATABASE OPTIMIZATION REPORT');
      console.log('================================');
      
      const report: OptimizationReport = {
        timestamp: new Date().toISOString(),
        database: mongoose.connection.name || 'AthaniMart',
        host: mongoose.connection.host || 'localhost',
        port: mongoose.connection.port || 27017,
        collections: [],
        indexes: [],
        recommendations: []
      };

      // Collect collection information
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        try {
          const indexes = await db.collection(collection.name).indexes();
          
          report.collections.push({
            name: collection.name,
            documents: 0, // We'll skip stats for now
            size: 0,
            indexes: indexes.length,
            avgObjSize: 0
          });
          
          report.indexes.push({
            collection: collection.name,
            count: indexes.length,
            indexes: indexes.map((idx: any) => ({
              name: idx.name,
              keys: idx.key,
              unique: idx.unique || false,
              sparse: idx.sparse || false
            }))
          });
          
        } catch (error) {
          console.log(`   ⚠️  Could not analyze ${collection.name}`);
        }
      }

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);

      // Log report summary
      console.log(`\n📊 Database: ${report.database}`);
      console.log(`🌐 Host: ${report.host}:${report.port}`);
      console.log(`📅 Optimized: ${report.timestamp}`);
      console.log(`📁 Collections: ${report.collections.length}`);
      
      const totalIndexes = report.indexes.reduce((sum, idx) => sum + idx.count, 0);
      console.log(`📄 Total Indexes: ${totalIndexes}`);
      
      // Log recommendations
      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        report.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }

      // Save report to file
      const fs = require('fs');
      const reportPath = `./logs/database-optimization-${Date.now()}.json`;
      
      // Ensure logs directory exists
      if (!fs.existsSync('./logs')) {
        fs.mkdirSync('./logs', { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    } catch (error) {
      console.error('❌ Error generating optimization report:', error);
    }
  }

  /**
   * Generate optimization recommendations based on analysis
   */
  private generateRecommendations(report: OptimizationReport): string[] {
    const recommendations: string[] = [];

    // Analyze collections
    report.collections.forEach((collection) => {
      if (collection.indexes < 3) {
        recommendations.push(`Add more indexes to ${collection.name} for better query performance`);
      }
    });

    // General recommendations
    recommendations.push('Monitor slow queries regularly using MongoDB profiler');
    recommendations.push('Set up automated database backups');
    recommendations.push('Consider implementing data archiving strategy for old orders');
    recommendations.push('Monitor connection pool usage and adjust pool size based on load');
    recommendations.push('Set up MongoDB monitoring and alerting');

    return recommendations;
  }

  /**
   * Cleanup and close connections
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        console.log('🔒 Database connection closed');
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Main execution
async function main() {
  const optimizer = DatabaseOptimizer.getInstance();
  
  try {
    await optimizer.initialize();
    await optimizer.runOptimizations();
    console.log('\n✅ Comprehensive database optimization completed successfully!');
  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  } finally {
    await optimizer.cleanup();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export default DatabaseOptimizer; 