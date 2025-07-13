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

// Add a type guard for stock
function hasStock(product: any): product is { stock: number } {
  return product && typeof product === 'object' && 'stock' in product && typeof product.stock === 'number';
}

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
        }
        // TODO: If you want to check store inventory, check StoreProduct.quantity here.
        // else if (item.quantity > product.stock) {
        //   ctx.addIssue({
        //     code: z.ZodIssueCode.custom,
        //     message: `Insufficient stock for product: ${product.name}`,
        //     path: ['items', i, 'quantity']
        //   });
        // }
      }
    }
  }
});

// Allowed order status transitions:
// PLACED -> ACCEPTED_BY_VENDOR -> PREPARING -> READY_FOR_PICKUP -> ACCEPTED_BY_AGENT -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
// Only vendors can move through PLACED, ACCEPTED_BY_VENDOR, PREPARING, READY_FOR_PICKUP.
// Only agents can move through ACCEPTED_BY_AGENT, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED.
// PICKED_UP status requires PIN verification via separate endpoint.
export const orderStatusSchema = z.object({
  status: z.enum([
    'PLACED',
    'ACCEPTED_BY_VENDOR',
    'PREPARING',
    'READY_FOR_PICKUP',
    'ACCEPTED_BY_AGENT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REJECTED',
  ]), // Note: PICKED_UP is handled via separate PIN verification endpoint
});

// PIN verification schema for pickup
export const orderPickupSchema = z.object({
  pin: z.string().length(4, { message: 'PIN must be exactly 4 digits' })
    .regex(/^[0-9]{4}$/, { message: 'PIN must contain only digits' }),
});

// PIN verification schema for delivery
export const orderDeliverySchema = z.object({
  pin: z.string().length(4, { message: 'PIN must be exactly 4 digits' })
    .regex(/^[0-9]{4}$/, { message: 'PIN must contain only digits' }),
});
