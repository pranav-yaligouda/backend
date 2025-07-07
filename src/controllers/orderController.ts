/**
 * Order Controller
 * Handles all order-related endpoints for customers, hotel managers, store owners, and delivery agents.
 * All responses follow the { success, data, error } structure for consistency.
 */
import { Request, Response, NextFunction } from 'express';
import OrderService from '../services/orderService';
import { orderQuerySchema, orderCreateSchema, orderStatusSchema } from '../validation/order';
import { OrderStatus } from '../models/Order';
import { AuthRequest } from '../types/AuthRequest';
import mongoose from 'mongoose';

export default class OrderController {
  /**
   * Place a new order (customer).
   * Requires authentication.
   */
  static async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user._id) return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      // Validate body
      const parsed = await orderCreateSchema.safeParseAsync(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, data: null, error: parsed.error.flatten() });
      }
      const mongoose = require('mongoose');
      // Force customerId and businessId to ObjectId
      // Deep clone to avoid mutation issues
      const orderData = JSON.parse(JSON.stringify(parsed.data));
      if (req.user.role === 'customer' && req.user._id) {
        orderData.customerId = new mongoose.Types.ObjectId(req.user._id);
      } else {
        // Remove customerId if not a customer (avoid type error)
        delete orderData.customerId;
      }
      if (orderData.businessId) {
        if (typeof orderData.businessId === 'string' && mongoose.isValidObjectId(orderData.businessId)) {
          orderData.businessId = new mongoose.Types.ObjectId(orderData.businessId);
        } else if (typeof orderData.businessId === 'string') {
          // Remove invalid string businessId
          delete (orderData as any).businessId;
        }
      }
      // Final type safety: remove businessId if still string
      if (typeof orderData.businessId === 'string') {
        delete (orderData as any).businessId;
      }
      const order = await OrderService.createOrder(orderData);
      res.status(201).json({ success: true, data: order, error: null });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Get all orders for the current user (role-based).
   * Requires authentication.
   */
  /**
   * Get all orders for the current user (role-based, paginated).
   * GET /api/v1/orders?page=1&pageSize=20&status=...
   * Returns paginated orders for the current user.
   * Response: { success, data: { items, page, pageSize, totalPages, totalItems }, error }
   */
  static async getOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      // Validate and parse query params
      const parsed = orderQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, data: null, error: parsed.error.flatten() });
      }
      const { page, pageSize, status, dateFrom, dateTo } = parsed.data;
      const result = await OrderService.getOrdersByRole(req.user, { page, pageSize, status, dateFrom, dateTo });
      res.json({
        success: true,
        data: {
          items: result.data,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
          totalItems: result.total
        },
        error: null
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Get a single order by ID.
   * Requires authentication and access rights.
   */
  static async getOrderById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      const order: Record<string, any> | null = await OrderService.getOrderById(req.params.id, req.user);
      if (!order) return res.status(404).json({ success: false, data: null, error: 'Order not found or access denied' });
      res.json({ success: true, data: order, error: null });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Update the status of an order (vendor/agent).
   * Requires authentication and proper role.
   */
  static async updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      // Validate body
      const parsed = orderStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, data: null, error: parsed.error.flatten() });
      }
      const { status } = parsed.data;
      const order = await OrderService.updateOrderStatus(req.params.id, req.user, status as OrderStatus);
      if (!order) return res.status(404).json({ success: false, data: null, error: 'Order not found or access denied' });
      res.json({ success: true, data: order, error: null });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Get available orders for delivery agents.
   * Requires authentication (delivery agent role).
   */
  static async getAvailableOrdersForAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orders = await OrderService.getAvailableOrdersForAgent();
      res.json({ success: true, data: orders, error: null });
    } catch (err: any) {
      next(err);
    }
  }
}