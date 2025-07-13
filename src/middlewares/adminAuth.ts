import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Admin permission levels
export enum AdminPermission {
  // User Management
  VIEW_USERS = 'view_users',
  CREATE_USERS = 'create_users',
  UPDATE_USERS = 'update_users',
  DELETE_USERS = 'delete_users',
  VERIFY_AGENTS = 'verify_agents',
  
  // Business Management
  VIEW_HOTELS = 'view_hotels',
  MANAGE_HOTELS = 'manage_hotels',
  VIEW_STORES = 'view_stores',
  MANAGE_STORES = 'manage_stores',
  
  // Order Management
  VIEW_ORDERS = 'view_orders',
  MANAGE_ORDERS = 'manage_orders',
  VIEW_ANALYTICS = 'view_analytics',
  
  // System Management
  VIEW_SYSTEM = 'view_system',
  MANAGE_SYSTEM = 'manage_system',
  VIEW_LOGS = 'view_logs',
  MANAGE_SETTINGS = 'manage_settings'
}

// Admin role hierarchy
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support'
}

// Permission mapping for each admin role
const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: Object.values(AdminPermission),
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

// Extended user interface for admin context
interface AdminUser {
  id: string;
  role: string;
  adminRole?: AdminRole;
  permissions?: AdminPermission[];
  lastLoginAt?: Date;
  isActive?: boolean;
}

// Extended request interface
interface AdminRequest extends Request {
  adminUser?: AdminUser;
  adminPermissions?: AdminPermission[];
}

/**
 * Middleware to authenticate admin users
 * Validates JWT token and ensures user has admin role
 */
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Admin access token required' 
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          error: 'Invalid or expired admin token' 
        });
      }

      // Validate admin role
      if (decoded.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        });
      }

      // Set admin user context
      const adminReq = req as AdminRequest;
      const adminRole = (decoded.adminRole as AdminRole) || AdminRole.ADMIN;
      adminReq.adminUser = {
        id: decoded.id,
        role: decoded.role,
        adminRole: adminRole,
        permissions: decoded.permissions || ROLE_PERMISSIONS[adminRole],
        lastLoginAt: decoded.lastLoginAt,
        isActive: decoded.isActive !== false
      };
      adminReq.adminPermissions = adminReq.adminUser.permissions;

      // Log admin access
      console.log(`[ADMIN_ACCESS] ${req.method} ${req.originalUrl} - Admin: ${decoded.id} (${decoded.adminRole || AdminRole.ADMIN})`);
      
      next();
    });
  } catch (error) {
    console.error('[ADMIN_AUTH_ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Admin authentication failed' 
    });
  }
};

/**
 * Middleware to check specific admin permissions
 * @param requiredPermissions - Array of permissions required for the route
 */
export const requireAdminPermissions = (requiredPermissions: AdminPermission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminReq = req as AdminRequest;
    
    if (!adminReq.adminUser) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin authentication required' 
      });
    }

    // Grant all permissions to super_admin
    if (adminReq.adminUser.adminRole === 'super_admin') {
      return next();
    }

    // Check if admin has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission => 
      adminReq.adminPermissions!.includes(permission)
    );

    if (!hasAllPermissions) {
      console.warn(`[ADMIN_PERMISSION_DENIED] Admin ${adminReq.adminUser.id} lacks permissions: ${requiredPermissions.join(', ')}`);
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient admin permissions',
        requiredPermissions,
        userPermissions: adminReq.adminPermissions
      });
    }

    next();
  };
};

/**
 * Middleware to check admin role level
 * @param minimumRole - Minimum admin role required
 */
export const requireAdminRole = (minimumRole: AdminRole) => {
  const roleHierarchy = {
    [AdminRole.SUPER_ADMIN]: 4,
    [AdminRole.ADMIN]: 3,
    [AdminRole.MODERATOR]: 2,
    [AdminRole.SUPPORT]: 1
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const adminReq = req as AdminRequest;
    
    if (!adminReq.adminUser) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin authentication required' 
      });
    }

    const userRoleLevel = roleHierarchy[adminReq.adminUser.adminRole || AdminRole.ADMIN];
    const requiredRoleLevel = roleHierarchy[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      console.warn(`[ADMIN_ROLE_DENIED] Admin ${adminReq.adminUser.id} (${adminReq.adminUser.adminRole}) cannot access ${minimumRole} level`);
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient admin role level',
        requiredRole: minimumRole,
        userRole: adminReq.adminUser.adminRole
      });
    }

    next();
  };
};

/**
 * Audit logging middleware for admin actions
 */
export const adminAuditLog = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminReq = req as AdminRequest;
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log admin action
      if (adminReq.adminUser) {
        const logData = {
          timestamp: new Date().toISOString(),
          adminId: adminReq.adminUser.id,
          adminRole: adminReq.adminUser.adminRole,
          action,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
          requestBody: req.body,
          responseData: typeof data === 'string' ? data : JSON.stringify(data)
        };
        
        console.log('[ADMIN_AUDIT_LOG]', JSON.stringify(logData));
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

export default authenticateAdmin; 