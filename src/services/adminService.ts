/**
 * Admin Service
 * Contains business logic for admin operations including user management,
 * analytics, system monitoring, and administrative functions.
 */
import User from '../models/User';
import Order from '../models/Order';
import Hotel from '../models/Hotel';
import Store from '../models/Store';
import Product from '../models/Product';
import Dish from '../models/Dish';
import { AdminRole, AdminPermission } from '../middlewares/adminAuth';

// ========================================
// USER MANAGEMENT SERVICES
// ========================================

export interface UserFilters {
  role?: string;
  verificationStatus?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface UserStats {
  total: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  newThisMonth: number;
  activeThisMonth: number;
}

/**
 * Get comprehensive user statistics
 */
export const getUserStats = async (): Promise<UserStats> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    total,
    byRole,
    byStatus,
    newThisMonth,
    activeThisMonth
  ] = await Promise.all([
    User.countDocuments(),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    User.aggregate([
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
    ]),
    User.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }),
    User.countDocuments({
      lastOnlineAt: { $gte: startOfMonth, $lte: endOfMonth }
    })
  ]);

  const roleStats = byRole.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {} as Record<string, number>);

  const statusStats = byStatus.reduce((acc, item) => {
    acc[item._id || 'none'] = item.count;
    return acc;
  }, {} as Record<string, number>);

  return {
    total,
    byRole: roleStats,
    byStatus: statusStats,
    newThisMonth,
    activeThisMonth
  };
};

/**
 * Get filtered users with advanced search
 */
export const getFilteredUsers = async (filters: UserFilters) => {
  const { page = 1, limit = 20, role, verificationStatus, search, isActive } = filters;
  const skip = (page - 1) * limit;

  const query: any = {};
  
  if (role) query.role = role;
  if (verificationStatus) query.verificationStatus = verificationStatus;
  if (isActive !== undefined) query.isActive = isActive;
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { storeName: { $regex: search, $options: 'i' } },
      { hotelName: { $regex: search, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query)
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Update user with validation and audit
 */
export const updateUserWithAudit = async (
  userId: string, 
  updateData: any, 
  adminId: string
) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { ...updateData, updatedAt: new Date() },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new Error('User not found');
  }

  // Log the update
  console.log(`[ADMIN_AUDIT] User ${userId} updated by admin ${adminId}:`, updateData);

  return user;
};

// ========================================
// BUSINESS MANAGEMENT SERVICES
// ========================================

export interface BusinessStats {
  hotels: {
    total: number;
    approved: number;
    pending: number;
    active: number;
  };
  stores: {
    total: number;
    approved: number;
    pending: number;
    active: number;
  };
}

/**
 * Get business statistics
 */
export const getBusinessStats = async (): Promise<BusinessStats> => {
  const [hotelStats, storeStats] = await Promise.all([
    Hotel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: ['$isApproved', 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$isApproved', false] }, 1, 0] } },
          active: { $sum: { $cond: [{ $and: ['$isApproved', { $ne: ['$isActive', false] }] }, 1, 0] } }
        }
      }
    ]),
    Store.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: ['$isApproved', 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$isApproved', false] }, 1, 0] } },
          active: { $sum: { $cond: [{ $and: ['$isApproved', { $ne: ['$isActive', false] }] }, 1, 0] } }
        }
      }
    ])
  ]);

  return {
    hotels: hotelStats[0] || { total: 0, approved: 0, pending: 0, active: 0 },
    stores: storeStats[0] || { total: 0, approved: 0, pending: 0, active: 0 }
  };
};

/**
 * Approve or reject business with notification
 */
export const approveBusinessWithNotification = async (
  businessId: string,
  businessType: 'hotel' | 'store',
  isApproved: boolean,
  rejectionReason?: string,
  adminId?: string
) => {
  const Model = businessType === 'hotel' ? Hotel : Store;
  const updateData: any = {
    isApproved,
    updatedAt: new Date()
  };

  if (!isApproved && rejectionReason) {
    updateData.rejectionReason = rejectionReason;
  }

  const business = await (Model as any).findByIdAndUpdate(
    businessId,
    updateData,
    { new: true }
  ).populate(businessType === 'hotel' ? 'manager' : 'owner', 'name phone email');

  if (!business) {
    throw new Error(`${businessType} not found`);
  }

  // Log the action
  console.log(`[ADMIN_AUDIT] ${businessType} ${businessId} ${isApproved ? 'approved' : 'rejected'} by admin ${adminId}`);

  // TODO: Send notification to business owner
  // await notificationService.sendBusinessApprovalNotification(business, isApproved, rejectionReason);

  return business;
};

// ========================================
// ORDER ANALYTICS SERVICES
// ========================================

export interface OrderAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byBusinessType: Record<string, number>;
  revenue: {
    total: number;
    byDay: Array<{ date: string; revenue: number }>;
    byBusinessType: Record<string, number>;
  };
  recentActivity: any[];
}

/**
 * Get comprehensive order analytics
 */
export const getOrderAnalytics = async (
  startDate?: Date,
  endDate?: Date
): Promise<OrderAnalytics> => {
  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = startDate;
    if (endDate) dateFilter.createdAt.$lte = endDate;
  }

  const [
    total,
    byStatus,
    byBusinessType,
    revenueData,
    recentActivity
  ] = await Promise.all([
    Order.countDocuments(dateFilter),
    Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$businessType', count: { $sum: 1 } } }
    ]),
    Order.aggregate([
      { $match: { ...dateFilter, status: 'DELIVERED' } },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          byBusinessType: {
            $push: {
              businessType: '$businessType',
              revenue: { $multiply: ['$items.price', '$items.quantity'] }
            }
          }
        }
      }
    ]),
    Order.find(dateFilter)
      .populate('customerId', 'name')
      .populate('deliveryAgentId', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
  ]);

  const statusStats = byStatus.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {} as Record<string, number>);

  const businessTypeStats = byBusinessType.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {} as Record<string, number>);

  const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
  const revenueByBusinessType = revenueData.length > 0 
    ? revenueData[0].byBusinessType.reduce((acc: any, item: any) => {
        acc[item.businessType] = (acc[item.businessType] || 0) + item.revenue;
        return acc;
      }, {})
    : {};

  return {
    total,
    byStatus: statusStats,
    byBusinessType: businessTypeStats,
    revenue: {
      total: totalRevenue,
      byDay: [], // TODO: Implement daily revenue aggregation
      byBusinessType: revenueByBusinessType
    },
    recentActivity: recentActivity
  };
};

// ========================================
// SYSTEM MONITORING SERVICES
// ========================================

export interface SystemHealth {
  database: {
    connected: boolean;
    collections: any[];
    performance: {
      slowQueries: number;
      averageResponseTime: number;
    };
  };
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    percentage: number;
  };
  uptime: number;
  environment: string;
  version: string;
}

/**
 * Get comprehensive system health metrics
 */
export const getSystemHealthMetrics = async (): Promise<SystemHealth> => {
  const memoryUsage = process.memoryUsage();
  const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  // Get database stats
  const collections = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Hotel.countDocuments(),
    Store.countDocuments()
  ]);

  return {
    database: {
      connected: true, // Assuming connection is active
      collections,
      performance: {
        slowQueries: 0, // TODO: Implement slow query monitoring
        averageResponseTime: 0 // TODO: Implement response time monitoring
      }
    },
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      percentage: memoryPercentage
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };
};

// ========================================
// ADMIN ROLE MANAGEMENT SERVICES
// ========================================

/**
 * Create admin user with proper role assignment
 */
export const createAdminUser = async (adminData: {
  name: string;
  phone: string;
  email?: string;
  password: string;
  adminRole: AdminRole;
  createdBy: string;
}) => {
  const { name, phone, email, password, adminRole, createdBy } = adminData;

  // Validate admin role hierarchy
  if (adminRole === AdminRole.SUPER_ADMIN) {
    const superAdminCount = await User.countDocuments({
      role: 'admin',
      adminRole: AdminRole.SUPER_ADMIN,
      isActive: true
    });
    
    if (superAdminCount > 0) {
      throw new Error('Only one super admin is allowed');
    }
  }

  const user = new User({
    name,
    phone,
    email,
    password,
    role: 'admin',
    adminRole,
    isActive: true,
    createdBy
  });

  await user.save();

  console.log(`[ADMIN_AUDIT] New admin user created by ${createdBy}:`, {
    id: user._id,
    name: user.name,
    adminRole: user.adminRole
  });

  return user;
};

/**
 * Update admin role with validation
 */
export const updateAdminRole = async (
  adminId: string,
  newRole: AdminRole,
  updatedBy: string
) => {
  const admin = await User.findById(adminId);
  
  if (!admin || admin.role !== 'admin') {
    throw new Error('Admin user not found');
  }

  // Prevent super admin role modification
  if (admin.adminRole === AdminRole.SUPER_ADMIN && newRole !== AdminRole.SUPER_ADMIN) {
    throw new Error('Cannot modify super admin role');
  }

  // Prevent creating multiple super admins
  if (newRole === AdminRole.SUPER_ADMIN && admin.adminRole !== AdminRole.SUPER_ADMIN) {
    const superAdminCount = await User.countDocuments({
      role: 'admin',
      adminRole: AdminRole.SUPER_ADMIN,
      isActive: true
    });
    
    if (superAdminCount > 0) {
      throw new Error('Only one super admin is allowed');
    }
  }

  admin.adminRole = newRole;
  admin.updatedAt = new Date();
  await admin.save();

  console.log(`[ADMIN_AUDIT] Admin role updated by ${updatedBy}:`, {
    adminId: admin._id,
    oldRole: admin.adminRole,
    newRole
  });

  return admin;
};

// ========================================
// EXPORT ALL SERVICES
// ========================================

export default {
  getUserStats,
  getFilteredUsers,
  updateUserWithAudit,
  getBusinessStats,
  approveBusinessWithNotification,
  getOrderAnalytics,
  getSystemHealthMetrics,
  createAdminUser,
  updateAdminRole
}; 