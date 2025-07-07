import { z } from 'zod';

// Pagination & filtering for GET /orders
export const orderQuerySchema = z.object({
  page: z.preprocess(
    val => (val === '' || val === undefined ? undefined : val),
    z.union([z.string(), z.number()]).optional()
  )
    .transform(v => typeof v === 'string' ? (v ? parseInt(v) : 1) : (typeof v === 'number' ? v : 1))
    .refine(v => Number.isInteger(v) && v > 0, { message: 'page must be a positive integer' }),

  pageSize: z.preprocess(
    val => (val === '' || val === undefined ? undefined : val),
    z.union([z.string(), z.number()]).optional()
  )
    .transform(v => typeof v === 'string' ? (v ? parseInt(v) : 10) : (typeof v === 'number' ? v : 10))
    .refine(v => Number.isInteger(v) && v > 0 && v <= 100, { message: 'pageSize must be between 1 and 100' }),

  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

import ProductModel from '../models/Product';

export const orderCreateSchema = z.object({
  businessType: z.enum(['hotel', 'store']),
  businessId: z.string(),
  customerId: z.string().optional(),
  items: z.array(z.object({
    type: z.enum(['dish', 'product']),
    itemId: z.string(),
    name: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().nonnegative(),
  })),
  deliveryAddress: z.object({
    addressLine: z.string().min(1),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  pickupAddress: z.object({
    addressLine: z.string().min(1),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  paymentMethod: z.enum(['cod', 'online']),
  notes: z.string().optional(),
}).superRefine(async (data, ctx) => {
  if (data.businessType === 'store') {
    for (const [i, item] of data.items.entries()) {
      if (item.type === 'product') {
        const product = await ProductModel.findById(item.itemId);
        if (!product || !product.available) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Product not found or unavailable: ${item.name}`,
            path: ['items', i, 'itemId']
          });
        } else if (item.quantity > product.stock) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Insufficient stock for product: ${product.name}`,
            path: ['items', i, 'quantity']
          });
        }
      }
    }
  }
});

export const orderStatusSchema = z.object({
  status: z.enum([
    'PLACED',
    'ACCEPTED_BY_VENDOR',
    'PREPARING',
    'READY_FOR_PICKUP',
    'ACCEPTED_BY_AGENT',
    'PICKED_UP',
    'DELIVERED',
    'CANCELLED',
    'REJECTED',
  ]),
});
