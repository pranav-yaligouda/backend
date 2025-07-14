import { z } from 'zod';

// ========================================
// USER MANAGEMENT VALIDATION
// ========================================

export const adminUserUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(7, 'Phone number too short').max(15, 'Phone number too long').optional(),
  role: z.enum(['customer', 'hotel_manager', 'store_owner', 'delivery_agent', 'admin'], {
    errorMap: () => ({ message: 'Invalid user role' })
  }).optional(),
  adminRole: z.enum(['super_admin', 'admin', 'moderator', 'support'], {
    errorMap: () => ({ message: 'Invalid admin role' })
  }).optional(),
  isActive: z.boolean().optional(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected'], {
    errorMap: () => ({ message: 'Invalid verification status' })
  }).optional(),
  storeName: z.string().min(1, 'Store name is required').optional(),
  hotelName: z.string().min(1, 'Hotel name is required').optional(),
  driverLicenseNumber: z.string().min(5, 'Driver license number too short').optional(),
  vehicleRegistrationNumber: z.string().min(5, 'Vehicle registration number too short').optional()
}).superRefine((data, ctx) => {
  // Validate role-specific fields
  if (data.role === 'store_owner' && !data.storeName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Store name is required for store owners',
      path: ['storeName']
    });
  }
  if (data.role === 'hotel_manager' && !data.hotelName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Hotel name is required for hotel managers',
      path: ['hotelName']
    });
  }
  if (data.role === 'delivery_agent' && data.verificationStatus === 'verified') {
    if (!data.driverLicenseNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Driver license number is required for verified agents',
        path: ['driverLicenseNumber']
      });
    }
    if (!data.vehicleRegistrationNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vehicle registration number is required for verified agents',
        path: ['vehicleRegistrationNumber']
      });
    }
  }
});

export const adminUserQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().min(1, 'Page must be at least 1')
  ).optional().default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')
  ).optional().default('20'),
  role: z.enum(['customer', 'hotel_manager', 'store_owner', 'delivery_agent', 'admin']).optional(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
  search: z.string().min(1, 'Search term must not be empty').optional(),
  isActive: z.string().transform(val => val === 'true').optional()
});

// ========================================
// AGENT VERIFICATION VALIDATION
// ========================================

export const agentVerificationSchema = z.object({
  verificationStatus: z.enum(['verified', 'rejected'], {
    errorMap: () => ({ message: 'Invalid verification status' })
  }),
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason too long')
    .optional()
}).superRefine((val, ctx) => {
  if (val.verificationStatus === 'rejected' && !val.rejectionReason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Rejection reason required' });
  }
});

// ========================================
// BUSINESS APPROVAL VALIDATION
// ========================================

export const businessApprovalSchema = z.object({
  isApproved: z.boolean(),
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason too long')
    .optional()
}).superRefine((val, ctx) => {
  if (val.isApproved === false && !val.rejectionReason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Rejection reason required' });
  }
});

export const businessQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().min(1, 'Page must be at least 1')
  ).optional().default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')
  ).optional().default('20'),
  search: z.string().min(1, 'Search term must not be empty').optional(),
  isApproved: z.string().transform(val => val === 'true').optional(),
  category: z.string().optional()
});

// ========================================
// ORDER MANAGEMENT VALIDATION
// ========================================

export const orderQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().min(1, 'Page must be at least 1')
  ).optional().default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')
  ).optional().default('20'),
  status: z.enum([
    'PLACED',
    'ACCEPTED_BY_VENDOR',
    'PREPARING',
    'READY_FOR_PICKUP',
    'ACCEPTED_BY_AGENT',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REJECTED'
  ]).optional(),
  businessType: z.enum(['hotel', 'store']).optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  customerId: z.string().min(1, 'Customer ID is required').optional(),
  businessId: z.string().min(1, 'Business ID is required').optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    'PLACED',
    'ACCEPTED_BY_VENDOR',
    'PREPARING',
    'READY_FOR_PICKUP',
    'ACCEPTED_BY_AGENT',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REJECTED'
  ], {
    errorMap: () => ({ message: 'Invalid order status' })
  }),
  notes: z.string().max(500, 'Notes too long').optional()
});

// ========================================
// ANALYTICS VALIDATION
// ========================================

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  businessType: z.enum(['hotel', 'store']).optional(),
  status: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).optional().default('day'),
  metrics: z.array(z.enum([
    'orders',
    'revenue',
    'users',
    'businesses',
    'deliveries'
  ])).optional().default(['orders', 'revenue'])
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
});

// ========================================
// SYSTEM SETTINGS VALIDATION
// ========================================

export const systemSettingsSchema = z.object({
  maintenance: z.boolean().optional(),
  registration: z.boolean().optional(),
  maxFileSize: z.string().regex(/^\d+[KMG]B$/, 'Invalid file size format (e.g., 5MB)').optional(),
  sessionTimeout: z.string().regex(/^\d+[hmd]$/, 'Invalid timeout format (e.g., 24h)').optional(),
  rateLimit: z.object({
    windowMs: z.number().min(60000, 'Rate limit window must be at least 1 minute').optional(),
    max: z.number().min(1, 'Rate limit max must be at least 1').optional()
  }).optional(),
  email: z.object({
    enabled: z.boolean().optional(),
    provider: z.enum(['smtp', 'sendgrid', 'mailgun']).optional(),
    fromAddress: z.string().email('Invalid email address').optional()
  }).optional()
});

// ========================================
// AUDIT LOG VALIDATION
// ========================================

export const auditLogQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().min(1, 'Page must be at least 1')
  ).optional().default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')
  ).optional().default('20'),
  adminId: z.string().min(1, 'Admin ID is required').optional(),
  action: z.string().min(1, 'Action is required').optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  statusCode: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().min(100, 'Invalid status code').max(599, 'Invalid status code')
  ).optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
});

// ========================================
// EXPORT ALL SCHEMAS
// ========================================

export default {
  adminUserUpdateSchema,
  adminUserQuerySchema,
  agentVerificationSchema,
  businessApprovalSchema,
  businessQuerySchema,
  orderQuerySchema,
  orderStatusUpdateSchema,
  analyticsQuerySchema,
  systemSettingsSchema,
  auditLogQuerySchema
}; 