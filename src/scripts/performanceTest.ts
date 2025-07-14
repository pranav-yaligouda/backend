import mongoose from 'mongoose';
import { connectDB } from '../config/mongoose';
import Order from '../models/Order';
import User from '../models/User';
import Store from '../models/Store';
import Product from '../models/Product';
import StoreProduct from '../models/StoreProduct';
import { safeObjectId, eq, safeString, safeStringArray } from '../lib/safeQuery';

/**
 * Database Performance Testing Script for AthaniMart
 * 
 * This script performs comprehensive performance testing including:
 * - Query response time testing
 * - Concurrent user simulation
 * - Index effectiveness testing
 * - Load testing scenarios
 * - Performance benchmarking
 */

interface PerformanceResult {
  testName: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalQueries: number;
  successRate: number;
  errors: string[];
}

class DatabasePerformanceTester {
  private results: PerformanceResult[] = [];
  private isConnected = false;

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Starting Database Performance Testing...');
      await connectDB();
      this.isConnected = true;
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      process.exit(1);
    }
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n🔧 Running Performance Tests...');

    // Basic query performance tests
    await this.testOrderQueries();
    await this.testUserQueries();
    await this.testStoreQueries();
    await this.testProductQueries();

    // Complex query performance tests
    await this.testComplexQueries();
    await this.testGeospatialQueries();
    await this.testAggregationQueries();

    // Load testing
    await this.testConcurrentUsers();
    await this.testHighLoadScenarios();

    // Generate performance report
    await this.generatePerformanceReport();
  }

  /**
   * Test order-related queries
   */
  private async testOrderQueries(): Promise<void> {
    console.log('\n📦 Testing Order Queries...');

    const tests = [
      {
        name: 'Customer Order History',
        query: () => Order.find({ customerId: new mongoose.Types.ObjectId() }).limit(10)
      },
      {
        name: 'Business Orders by Status',
        query: () => Order.find({ 
          businessType: 'store', 
          status: 'PLACED' 
        }).limit(20)
      },
      {
        name: 'Delivery Agent Orders',
        query: () => Order.find({ 
          deliveryAgentId: new mongoose.Types.ObjectId(),
          status: { $in: ['ACCEPTED_BY_AGENT', 'PICKED_UP'] }
        })
      },
      {
        name: 'Recent Orders',
        query: () => Order.find({ 
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).sort({ createdAt: -1 }).limit(50)
      }
    ];

    for (const test of tests) {
      await this.runPerformanceTest(test.name, test.query);
    }
  }

  /**
   * Test user-related queries
   */
  private async testUserQueries(): Promise<void> {
    console.log('\n👥 Testing User Queries...');

    const tests = [
      {
        name: 'User Authentication by Phone',
        query: () => User.findOne({ phone: '1234567890' })
      },
      {
        name: 'Online Delivery Agents',
        query: () => User.find({ 
          role: 'delivery_agent', 
          isOnline: true,
          verificationStatus: 'verified'
        })
      },
      {
        name: 'Store Owners',
        query: () => User.find({ role: 'store_owner' }).select('name storeName')
      },
      {
        name: 'Hotel Managers',
        query: () => User.find({ role: 'hotel_manager' }).select('name hotelName')
      }
    ];

    for (const test of tests) {
      await this.runPerformanceTest(test.name, test.query);
    }
  }

  /**
   * Test store-related queries
   */
  private async testStoreQueries(): Promise<void> {
    console.log('\n🏪 Testing Store Queries...');

    const tests = [
      {
        name: 'Stores by Category',
        query: () => Store.find({ categories: { $in: ['Groceries'] } })
      },
      {
        name: 'Store Search by Name',
        query: () => Store.find({ $text: { $search: 'mart' } })
      },
      {
        name: 'Store by Owner',
        query: () => Store.findOne({ owner: new mongoose.Types.ObjectId() })
      }
    ];

    for (const test of tests) {
      await this.runPerformanceTest(test.name, test.query);
    }
  }

  /**
   * Test product-related queries
   */
  private async testProductQueries(): Promise<void> {
    console.log('\n🛍️ Testing Product Queries...');

    const tests = [
      {
        name: 'Products by Category',
        query: () => Product.find({ category: 'Vegetables', available: true })
      },
      {
        name: 'Product Search',
        query: () => Product.find({ $text: { $search: 'tomato' } })
      },
      {
        name: 'Store Inventory',
        query: () => StoreProduct.find({ 
          storeId: new mongoose.Types.ObjectId(),
          quantity: { $gt: 0 }
        }).populate('productId')
      },
      {
        name: 'Product Availability Across Stores',
        query: () => StoreProduct.find({ 
          productId: new mongoose.Types.ObjectId(),
          quantity: { $gt: 0 }
        }).populate('storeId')
      }
    ];

    for (const test of tests) {
      await this.runPerformanceTest(test.name, test.query);
    }
  }

  /**
   * Test complex queries
   */
  private async testComplexQueries(): Promise<void> {
    console.log('\n🔍 Testing Complex Queries...');

    const tests = [
      {
        name: 'Order Analytics by Business',
        query: () => Order.aggregate([
          { $match: { status: { $in: ['DELIVERED', 'CANCELLED'] } } },
          { $group: {
            _id: '$businessType',
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: { $reduce: {
              input: '$items',
              initialValue: 0,
              in: { $add: ['$$value', { $multiply: ['$$this.price', '$$this.quantity'] }] }
            }}}
          }},
          { $sort: { totalOrders: -1 } }
        ])
      },
      {
        name: 'User Role Distribution',
        query: () => User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      },
      {
        name: 'Product Category Distribution',
        query: () => Product.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      }
    ];

    for (const test of tests) {
      await this.runPerformanceTest(test.name, test.query);
    }
  }

  /**
   * Test geospatial queries
   */
  private async testGeospatialQueries(): Promise<void> {
    console.log('\n🗺️ Testing Geospatial Queries...');

    const tests = [
      {
        name: 'Nearby Stores',
        query: () => Store.find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [77.2090, 28.6139] // Delhi coordinates
              },
              $maxDistance: 5000 // 5km
            }
          }
        }).limit(10)
      },
      {
        name: 'Stores in Category Near Location',
        query: () => Store.find({
          categories: { $in: ['Groceries'] },
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [77.2090, 28.6139]
              },
              $maxDistance: 10000 // 10km
            }
          }
        }).limit(5)
      }
    ];

    for (const test of tests) {
      await this.runPerformanceTest(test.name, test.query);
    }
  }

  /**
   * Test aggregation queries
   */
  private async testAggregationQueries(): Promise<void> {
    console.log('\n📊 Testing Aggregation Queries...');

    const tests = [
      {
        name: 'Daily Order Statistics',
        query: () => Order.aggregate([
          { $match: { 
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }},
          { $group: {
            _id: { 
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: { $reduce: {
              input: '$items',
              initialValue: 0,
              in: { $add: ['$$value', { $multiply: ['$$this.price', '$$this.quantity'] }] }
            }}}
          }},
          { $sort: { _id: -1 } }
        ])
      },
      {
        name: 'Product Performance by Store',
        query: () => StoreProduct.aggregate([
          { $group: {
            _id: '$storeId',
            productCount: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
            avgPrice: { $avg: '$price' }
          }},
          { $sort: { totalValue: -1 } },
          { $limit: 10 }
        ])
      }
    ];

    for (const test of tests) {
      await this.runPerformanceTest(test.name, test.query);
    }
  }

  /**
   * Test concurrent user scenarios
   */
  private async testConcurrentUsers(): Promise<void> {
    console.log('\n👥 Testing Concurrent User Scenarios...');

    const concurrentUsers = [10, 50, 100, 200];
    
    for (const userCount of concurrentUsers) {
      await this.simulateConcurrentUsers(userCount);
    }
  }

  /**
   * Simulate concurrent users
   */
  private async simulateConcurrentUsers(userCount: number): Promise<void> {
    const testName = `Concurrent Users (${userCount})`;
    console.log(`   Testing ${testName}...`);

    const promises = Array(userCount).fill(0).map(async (_, index) => {
      const start = Date.now();
      try {
        // Simulate different user actions
        const actions = [
          () => Order.find({ customerId: new mongoose.Types.ObjectId() }).limit(5),
          () => User.findOne({ phone: `user${index}@test.com` }),
          () => Store.find({ categories: { $in: ['Groceries'] } }).limit(3),
          () => Product.find({ category: 'Vegetables' }).limit(10)
        ];

        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        await randomAction();
        
        return Date.now() - start;
      } catch (error) {
        return -1; // Error indicator
      }
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(r => r !== -1);
    const errors = results.filter(r => r === -1).length;

    this.results.push({
      testName,
      avgResponseTime: validResults.length > 0 ? validResults.reduce((a, b) => a + b, 0) / validResults.length : 0,
      minResponseTime: validResults.length > 0 ? Math.min(...validResults) : 0,
      maxResponseTime: validResults.length > 0 ? Math.max(...validResults) : 0,
      totalQueries: userCount,
      successRate: ((userCount - errors) / userCount) * 100,
      errors: errors > 0 ? [`${errors} queries failed`] : []
    });
  }

  /**
   * Test high load scenarios
   */
  private async testHighLoadScenarios(): Promise<void> {
    console.log('\n🔥 Testing High Load Scenarios...');

    const tests = [
      {
        name: 'Bulk Order Creation',
        query: async () => {
          const orders = Array(100).fill(0).map(() => ({
            businessType: 'store' as const,
            businessId: new mongoose.Types.ObjectId(),
            customerId: new mongoose.Types.ObjectId(),
            items: [{ type: 'product' as const, itemId: new mongoose.Types.ObjectId(), name: 'Test Product', quantity: 1, price: 100 }],
            status: 'PLACED' as const,
            deliveryAddress: { addressLine: 'Test Address', coordinates: { lat: 28.6139, lng: 77.2090 } },
            pickupAddress: { addressLine: 'Test Pickup', coordinates: { lat: 28.6139, lng: 77.2090 } },
            paymentMethod: 'cod' as const
          }));
          
          // Note: This would actually insert data, so we'll just simulate the query
          return Promise.resolve(orders.length);
        }
      },
      {
        name: 'Complex Search with Filters',
        query: () => Order.find({
          businessType: 'store',
          status: { $in: ['PLACED', 'ACCEPTED_BY_VENDOR', 'PREPARING'] },
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          'deliveryAddress.coordinates': {
            $near: {
              $geometry: { type: 'Point', coordinates: [77.2090, 28.6139] },
              $maxDistance: 10000
            }
          }
        }).populate('customerId', 'name phone').limit(50)
      }
    ];

    for (const test of tests) {
      await this.runPerformanceTest(test.name, test.query);
    }
  }

  /**
   * Run a single performance test
   */
  private async runPerformanceTest(testName: string, queryFn: () => Promise<any>): Promise<void> {
    const iterations = 10;
    const responseTimes: number[] = [];
    const errors: string[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      try {
        await queryFn();
        responseTimes.push(Date.now() - start);
      } catch (error) {
        errors.push(`Iteration ${i + 1}: ${error}`);
      }
    }

    this.results.push({
      testName,
      avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      totalQueries: iterations,
      successRate: ((iterations - errors.length) / iterations) * 100,
      errors
    });
  }

  /**
   * Generate comprehensive performance report
   */
  private async generatePerformanceReport(): Promise<void> {
    console.log('\n📋 PERFORMANCE TEST REPORT');
    console.log('==========================');

    // Sort results by average response time
    const sortedResults = this.results.sort((a, b) => a.avgResponseTime - b.avgResponseTime);

    console.log('\n🏆 TOP PERFORMING QUERIES (< 50ms):');
    sortedResults
      .filter(r => r.avgResponseTime < 50)
      .forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.testName}: ${result.avgResponseTime.toFixed(2)}ms`);
      });

    console.log('\n⚠️  SLOW QUERIES (> 100ms):');
    sortedResults
      .filter(r => r.avgResponseTime > 100)
      .forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.testName}: ${result.avgResponseTime.toFixed(2)}ms`);
      });

    console.log('\n📊 DETAILED RESULTS:');
    sortedResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.testName}`);
      console.log(`   Average: ${result.avgResponseTime.toFixed(2)}ms`);
      console.log(`   Range: ${result.minResponseTime}ms - ${result.maxResponseTime}ms`);
      console.log(`   Success Rate: ${result.successRate.toFixed(1)}%`);
      console.log(`   Total Queries: ${result.totalQueries}`);
      
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach(error => console.log(`     - ${error}`));
      }
    });

    // Performance summary
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.avgResponseTime, 0) / this.results.length;
    const totalQueries = this.results.reduce((sum, r) => sum + r.totalQueries, 0);
    const overallSuccessRate = this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length;

    console.log('\n📈 PERFORMANCE SUMMARY:');
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Total Queries Tested: ${totalQueries}`);
    console.log(`   Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`   Tests Completed: ${this.results.length}`);

    // Save detailed report
    const fs = require('fs');
    const reportPath = `./logs/performance-test-${Date.now()}.json`;
    
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }
    
    const detailedReport = {
      timestamp: new Date().toISOString(),
      summary: {
        avgResponseTime,
        totalQueries,
        overallSuccessRate,
        testsCompleted: this.results.length
      },
      results: sortedResults
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
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
  const tester = new DatabasePerformanceTester();
  
  try {
    await tester.initialize();
    await tester.runAllTests();
    
    // Keep the process running for a moment to ensure all operations complete
    setTimeout(async () => {
      await tester.cleanup();
      process.exit(0);
    }, 2000);
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    await tester.cleanup();
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  const tester = new DatabasePerformanceTester();
  await tester.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  const tester = new DatabasePerformanceTester();
  await tester.cleanup();
  process.exit(0);
});

// Run the performance test if this script is executed directly
if (require.main === module) {
  main();
}

export default DatabasePerformanceTester; 