/**
 * Order Controller
 * Handles all order-related endpoints for customers, hotel managers, store owners, and delivery agents.
 * All responses follow the { success, data, error } structure for consistency.
 */
import { Request, Response, NextFunction } from 'express';
import OrderService from '../services/orderService';
import { OrderStatus } from '../models/Order';
import { AuthRequest } from '../types/AuthRequest';

export default class OrderController {
  /**
   * Place a new order (customer).
   * Requires authentication.
   */
  static async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.user._id) return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      const order = await OrderService.createOrder({ ...req.body, customerId: req.user._id });
      res.status(201).json({ success: true, data: order, error: null });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Get all orders for the current user (role-based).
   * Requires authentication.
   */
  static async getOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      const orders = await OrderService.getOrdersByRole(req.user);
      res.json({ success: true, data: orders, error: null });
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
      const order = await OrderService.getOrderById(req.params.id, req.user);
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
      const { status } = req.body;
      if (!status) return res.status(400).json({ success: false, data: null, error: 'Status is required' });
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