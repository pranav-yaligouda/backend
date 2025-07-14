import { Router } from 'express';
import {
  authenticateAdmin,
  requireAdminPermissions,
  requireAdminRole,
  adminAuditLog,
  AdminPermission,
  AdminRole
} from '../middlewares/adminAuth';
import {
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
} from '../controllers/adminController';

const router = Router();

// ========================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ========================================
// All admin routes require admin authentication
router.use(authenticateAdmin);

// ========================================
// DASHBOARD & ANALYTICS
// ========================================
router.get(
  '/dashboard/analytics',
  requireAdminPermissions([AdminPermission.VIEW_ANALYTICS]),
  adminAuditLog('view_dashboard_analytics'),
  getDashboardAnalytics
);

router.get(
  '/system/health',
  requireAdminPermissions([AdminPermission.VIEW_SYSTEM]),
  adminAuditLog('view_system_health'),
  getSystemHealth
);

// ========================================
// USER MANAGEMENT
// ========================================
router.get(
  '/users',
  requireAdminPermissions([AdminPermission.VIEW_USERS]),
  adminAuditLog('view_all_users'),
  getAllUsers
);

router.get(
  '/users/:id',
  requireAdminPermissions([AdminPermission.VIEW_USERS]),
  adminAuditLog('view_user_details'),
  getUserById
);

router.put(
  '/users/:id',
  requireAdminPermissions([AdminPermission.UPDATE_USERS]),
  adminAuditLog('update_user'),
  updateUser
);

router.delete(
  '/users/:id',
  requireAdminPermissions([AdminPermission.DELETE_USERS]),
  requireAdminRole(AdminRole.ADMIN), // Only admin and above can delete users
  adminAuditLog('delete_user'),
  deleteUser
);

// ========================================
// DELIVERY AGENT VERIFICATION
// ========================================
router.get(
  '/agents/pending',
  requireAdminPermissions([AdminPermission.VERIFY_AGENTS]),
  adminAuditLog('view_pending_agents'),
  getPendingAgentVerifications
);

router.put(
  '/agents/:id/verify',
  requireAdminPermissions([AdminPermission.VERIFY_AGENTS]),
  adminAuditLog('verify_agent'),
  verifyAgent
);

// ========================================
// HOTEL MANAGEMENT
// ========================================
router.get(
  '/hotels',
  requireAdminPermissions([AdminPermission.VIEW_HOTELS]),
  adminAuditLog('view_all_hotels'),
  getAllHotels
);

router.put(
  '/hotels/:id/approve',
  requireAdminPermissions([AdminPermission.MANAGE_HOTELS]),
  adminAuditLog('approve_hotel'),
  (req, res, next) => {
    req.params.type = 'hotel';
    next();
  },
  approveBusiness
);

// ========================================
// STORE MANAGEMENT
// ========================================
router.get(
  '/stores',
  requireAdminPermissions([AdminPermission.VIEW_STORES]),
  adminAuditLog('view_all_stores'),
  getAllStores
);

router.put(
  '/stores/:id/approve',
  requireAdminPermissions([AdminPermission.MANAGE_STORES]),
  adminAuditLog('approve_store'),
  (req, res, next) => {
    req.params.type = 'store';
    next();
  },
  approveBusiness
);

// ========================================
// ORDER MANAGEMENT
// ========================================
router.get(
  '/orders',
  requireAdminPermissions([AdminPermission.VIEW_ORDERS]),
  adminAuditLog('view_all_orders'),
  getAllOrders
);

router.put(
  '/orders/:id/status',
  requireAdminPermissions([AdminPermission.MANAGE_ORDERS]),
  adminAuditLog('update_order_status'),
  updateOrderStatus
);

// ========================================
// ADMIN ROLE MANAGEMENT (SUPER ADMIN ONLY)
// ========================================
router.get(
  '/admins',
  requireAdminRole(AdminRole.SUPER_ADMIN),
  requireAdminPermissions([AdminPermission.VIEW_USERS]),
  adminAuditLog('view_admin_users'),
  (req, res, next) => {
    // Override query to only show admin users
    req.query.role = 'admin';
    getAllUsers(req, res, next);
  }
);

router.post(
  '/admins',
  requireAdminRole(AdminRole.SUPER_ADMIN),
  requireAdminPermissions([AdminPermission.CREATE_USERS]),
  adminAuditLog('create_admin_user'),
  createAdminUser
);

router.put(
  '/admins/:id/role',
  requireAdminRole(AdminRole.SUPER_ADMIN),
  requireAdminPermissions([AdminPermission.UPDATE_USERS]),
  adminAuditLog('update_admin_role'),
  (req, res, next) => {
    // Ensure only super admin can modify admin roles
    if (req.body.adminRole && req.body.adminRole === AdminRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        data: null,
        error: 'Cannot modify super admin role'
      });
    }
    updateUser(req, res, next);
  }
);

// ========================================
// SYSTEM SETTINGS (ADMIN AND ABOVE)
// ========================================
router.get(
  '/settings',
  requireAdminRole(AdminRole.ADMIN),
  requireAdminPermissions([AdminPermission.MANAGE_SETTINGS]),
  adminAuditLog('view_system_settings'),
  (req, res) => {
    res.json({
      success: true,
      data: {
        settings: {
          // System configuration settings
          maintenance: process.env.MAINTENANCE_MODE === 'true',
          registration: process.env.ALLOW_REGISTRATION !== 'false',
          maxFileSize: process.env.MAX_FILE_SIZE || '5MB',
          sessionTimeout: process.env.SESSION_TIMEOUT || '24h'
        }
      },
      error: null
    });
  }
);

router.put(
  '/settings',
  requireAdminRole(AdminRole.SUPER_ADMIN),
  requireAdminPermissions([AdminPermission.MANAGE_SETTINGS]),
  adminAuditLog('update_system_settings'),
  (req, res) => {
    // In a real implementation, you would update environment variables
    // or database settings here
    res.json({
      success: true,
      data: { message: 'Settings updated successfully' },
      error: null
    });
  }
);

// ========================================
// AUDIT LOGS (ADMIN AND ABOVE)
// ========================================
router.get(
  '/audit-logs',
  requireAdminRole(AdminRole.ADMIN),
  requireAdminPermissions([AdminPermission.VIEW_LOGS]),
  adminAuditLog('view_audit_logs'),
  (req, res) => {
    // In a real implementation, you would fetch audit logs from database
    res.json({
      success: true,
      data: {
        logs: [],
        message: 'Audit logs endpoint - implement with database logging'
      },
      error: null
    });
  }
);

// ========================================
// ERROR HANDLING FOR ADMIN ROUTES
// ========================================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: 'Admin endpoint not found'
  });
});

export default router; 