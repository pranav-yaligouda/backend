/**
 * Admin Controller
 * Handles all admin-related operations including user management, 
 * business oversight, analytics, and system administration.
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import User from '../models/User';
import Order from '../models/Order';
import Hotel from '../models/Hotel';
import Store from '../models/Store';
import Product from '../models/Product';
import Dish from '../models/Dish';
import { AdminPermission, AdminRole } from '../middlewares/adminAuth';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['customer', 'hotel_manager', 'store_owner', 'delivery_agent', 'admin']).optional(),
  adminRole: z.enum(['super_admin', 'admin', 'moderator', 'support']).optional(),
  isActive: z.boolean().optional(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional()
});

const agentVerificationSchema = z.object({
  verificationStatus: z.enum(['verified', 'rejected']),
  rejectionReason: z.string().optional()
});

const businessApprovalSchema = z.object({
  isApproved: z.boolean(),
  rejectionReason: z.string().optional()
});

const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  businessType: z.enum(['hotel', 'store']).optional(),
  status: z.string().optional()
});

// ========================================
// USER MANAGEMENT
// ========================================

/**
 * Get all users with pagination and filtering
 * Requires: VIEW_USERS permission
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, role, search, verificationStatus } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build query
    const query: any = {};
    if (role) query.role = role;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * Requires: VIEW_USERS permission
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * Requires: UPDATE_USERS permission
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = userUpdateSchema.parse(req.body);

    const user = await User.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user },
      error: null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        data: null,
        error: error.errors
      });
    }
    next(error);
  }
};

/**
 * Delete user (soft delete)
 * Requires: DELETE_USERS permission
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { message: 'User deactivated successfully' },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// DELIVERY AGENT VERIFICATION
// ========================================

/**
 * Get pending agent verifications
 * Requires: VERIFY_AGENTS permission
 */
export const getPendingAgentVerifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const agents = await User.find({
      role: 'delivery_agent',
      verificationStatus: 'pending'
    })
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

    const total = await User.countDocuments({
      role: 'delivery_agent',
      verificationStatus: 'pending'
    });

    res.json({
      success: true,
      data: {
        agents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify or reject delivery agent
 * Requires: VERIFY_AGENTS permission
 */
export const verifyAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { verificationStatus, rejectionReason } = agentVerificationSchema.parse(req.body);

    const updateData: any = { verificationStatus, updatedAt: new Date() };
    if (verificationStatus === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const agent = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!agent) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Agent not found'
      });
    }

    if (agent.role !== 'delivery_agent') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'User is not a delivery agent'
      });
    }

    res.json({
      success: true,
      data: { 
        agent,
        message: `Agent ${verificationStatus} successfully`
      },
      error: null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        data: null,
        error: error.errors
      });
    }
    next(error);
  }
};

// ========================================
// BUSINESS MANAGEMENT
// ========================================

/**
 * Get all hotels with pagination and filtering
 * Requires: VIEW_HOTELS permission
 */
export const getAllHotels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, isApproved } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } }
      ];
    }

    const hotels = await Hotel.find(query)
      .populate('manager', 'name phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Flatten address
    const hotelsWithAddress = hotels.map(hotel => ({
      ...hotel.toObject(),
      address: hotel.location?.address || '',
    }));

    const total = await Hotel.countDocuments(query);

    res.json({
      success: true,
      data: {
        hotels: hotelsWithAddress,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all stores with pagination and filtering
 * Requires: VIEW_STORES permission
 */
export const getAllStores = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, isApproved } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const stores = await Store.find(query)
      .populate('owner', 'name phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Store.countDocuments(query);

    res.json({
      success: true,
      data: {
        stores,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or reject business (hotel/store)
 * Requires: MANAGE_HOTELS or MANAGE_STORES permission
 */
export const approveBusiness = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, type } = req.params;
    const { isApproved, rejectionReason } = businessApprovalSchema.parse(req.body);

    let business;
    if (type === 'hotel') {
      business = await Hotel.findByIdAndUpdate(
        id,
        { 
          isApproved, 
          rejectionReason: isApproved ? undefined : rejectionReason,
          updatedAt: new Date() 
        },
        { new: true }
      ).populate('manager', 'name phone email');
    } else if (type === 'store') {
      business = await Store.findByIdAndUpdate(
        id,
        { 
          isApproved, 
          rejectionReason: isApproved ? undefined : rejectionReason,
          updatedAt: new Date() 
        },
        { new: true }
      ).populate('owner', 'name phone email');
    } else {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid business type'
      });
    }

    if (!business) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Business not found'
      });
    }

    res.json({
      success: true,
      data: { 
        business,
        message: `Business ${isApproved ? 'approved' : 'rejected'} successfully`
      },
      error: null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        data: null,
        error: error.errors
      });
    }
    next(error);
  }
};

// ========================================
// ORDER MANAGEMENT
// ========================================

/**
 * Get all orders with pagination and filtering
 * Requires: VIEW_ORDERS permission
 */
export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status, businessType, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (status) query.status = status;
    if (businessType) query.businessType = businessType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    let orders = await Order.find(query)
      .populate('customerId', 'name phone')
      .populate('deliveryAgentId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Manually fetch business details and flatten for response
    const ordersMapped = await Promise.all(orders.map(async (order) => {
      let businessName = '';
      let businessAddress = '';
      if (order.businessType === 'hotel') {
        const hotel = await Hotel.findById(order.businessId).select('name location');
        if (hotel) {
          businessName = hotel.name;
          businessAddress = hotel.location?.address || '';
        }
      } else if (order.businessType === 'store') {
        const store = await Store.findById(order.businessId).select('name location address');
        if (store) {
          businessName = store.name;
          businessAddress = store.location?.address || store.address || '';
        }
      }
      return {
        ...order.toObject(),
        orderId: order._id,
        customer: order.customerId,
        deliveryAgent: order.deliveryAgentId,
        businessName,
        businessAddress,
      };
    }));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders: ordersMapped,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (admin override)
 * Requires: MANAGE_ORDERS permission
 */
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      { 
        status, 
        notes: notes ? `${notes} (Admin override)` : undefined,
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    )
    .populate('customerId', 'name phone')
    .populate('deliveryAgentId', 'name phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: { 
        order,
        message: 'Order status updated successfully'
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// ANALYTICS & DASHBOARD
// ========================================

/**
 * Get admin dashboard analytics
 * Requires: VIEW_ANALYTICS permission
 */
export const getDashboardAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = analyticsQuerySchema.parse(req.query);
    
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments(dateFilter);
    const pendingAgents = await User.countDocuments({
      role: 'delivery_agent',
      verificationStatus: 'pending'
    });

    // Business statistics
    const totalHotels = await Hotel.countDocuments();
    const totalStores = await Store.countDocuments();
    const pendingHotels = await Hotel.countDocuments({ isApproved: false });
    const pendingStores = await Store.countDocuments({ isApproved: false });

    // Order statistics
    const totalOrders = await Order.countDocuments();
    const recentOrders = await Order.countDocuments(dateFilter);
    const completedOrders = await Order.countDocuments({
      ...dateFilter,
      status: 'DELIVERED'
    });
    const cancelledOrders = await Order.countDocuments({
      ...dateFilter,
      status: 'CANCELLED'
    });

    // Revenue calculation
    const revenueData = await Order.aggregate([
      { $match: { ...dateFilter, status: 'DELIVERED' } },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $multiply: [
                { $toDouble: { $ifNull: ["$items.price", 0] } },
                { $toInt: { $ifNull: ["$items.quantity", 0] } }
              ]
            }
          }
        }
      }
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // Recent activity (recent orders)
    let recentActivity = await Order.find(dateFilter)
      .populate('customerId', 'name phone')
      .populate('deliveryAgentId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(10);

    // Manually fetch business details for recentActivity and flatten for response
    const recentActivityMapped = await Promise.all(recentActivity.map(async (order) => {
      let businessName = '';
      let businessAddress = '';
      if (order.businessType === 'hotel') {
        const hotel = await Hotel.findById(order.businessId).select('name location');
        if (hotel) {
          businessName = hotel.name;
          businessAddress = hotel.location?.address || '';
        }
      } else if (order.businessType === 'store') {
        const store = await Store.findById(order.businessId).select('name location address');
        if (store) {
          businessName = store.name;
          businessAddress = store.location?.address || store.address || '';
        }
      }
      return {
        ...order.toObject(),
        orderId: order._id,
        customer: order.customerId,
        deliveryAgent: order.deliveryAgentId,
        businessName,
        businessAddress,
      };
    }));

    // Recent hotels and stores for overview
    const recentHotels = (await Hotel.find().populate('manager', 'name').sort({ createdAt: -1 }).limit(5))
      .map(hotel => ({
        ...hotel.toObject(),
        address: hotel.location?.address || '',
      }));
    const recentStores = (await Store.find().populate('owner', 'name').sort({ createdAt: -1 }).limit(5))
      .map(store => ({
        ...store.toObject(),
        address: store.location?.address || store.address || '',
      }));

    res.json({
      success: true,
      data: {
        analytics: {
          users: {
            total: totalUsers,
            new: newUsers,
            pendingAgents
          },
          businesses: {
            hotels: { total: totalHotels, pending: pendingHotels },
            stores: { total: totalStores, pending: pendingStores }
          },
          orders: {
            total: totalOrders,
            recent: recentOrders,
            completed: completedOrders,
            cancelled: cancelledOrders,
            revenue: totalRevenue
          }
        },
        recentActivity: recentActivityMapped,
        recentHotels,
        recentStores
      },
      error: null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        data: null,
        error: error.errors
      });
    }
    next(error);
  }
};

/**
 * Get system health and performance metrics
 * Requires: VIEW_SYSTEM permission
 */
export const getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Database connection status
    const dbStatus: { connected: boolean; collections: { name: string; count: number }[] } = {
      connected: mongoose.connection.readyState === 1,
      collections: []
    };

    // Use countDocuments for collection stats
    const collections = [
      { name: 'users', count: await User.countDocuments() },
      { name: 'orders', count: await Order.countDocuments() },
      { name: 'hotels', count: await Hotel.countDocuments() },
      { name: 'stores', count: await Store.countDocuments() }
    ];
    dbStatus.collections = collections;

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Uptime
    const uptime = process.uptime();

    res.json({
      success: true,
      data: {
        system: {
          uptime,
          memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            percentage: memoryPercentage
          }
        },
        database: dbStatus
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create admin user (Super Admin only)
 * Requires: CREATE_USERS permission and SUPER_ADMIN role
 */
export const createAdminUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, password, adminRole } = req.body;

    // Validate admin role
    if (!['admin', 'moderator', 'support'].includes(adminRole)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid admin role'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ phone }, { email }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        data: null,
        error: 'User with this phone or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const adminUser = new User({
      name,
      phone,
      email,
      password: hashedPassword,
      role: 'admin',
      adminRole,
      isActive: true,
      createdBy: (req as any).adminUser?.id || 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await adminUser.save();

    // Remove password from response
    const userResponse = adminUser.toObject();
    if (userResponse && 'password' in userResponse) {
      delete (userResponse as any).password;
    }

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        message: 'Admin user created successfully'
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getPendingAgentVerifications,
  verifyAgent,
  getAllHotels,
  getAllStores,
  approveBusiness,
  getAllOrders,
  updateOrderStatus,
  getDashboardAnalytics,
  getSystemHealth,
  createAdminUser
}; 