import Order, { IOrder, OrderStatus } from '../models/Order';
import User from '../models/User';
import mongoose from 'mongoose';

// Placeholder for Socket.io instance
let io: any = null;
export const setSocketIoInstance = (ioInstance: any) => {
  io = ioInstance;
};

export default class OrderService {
  // Create a new order
  static async createOrder(orderData: Partial<IOrder>): Promise<IOrder> {
    const order = await Order.create(orderData);
    // Emit real-time event to hotel/store owner
    if (io) {
      io.to(String(order.businessId)).emit('order:new', order);
    }
    return order;
  }

  // Get orders by user role
  static async getOrdersByRole(user: any): Promise<IOrder[]> {
    switch (user.role) {
      case 'customer':
        return Order.find({ customerId: user._id }).sort({ createdAt: -1 });
      case 'hotel_manager':
      case 'store_owner':
        return Order.find({ businessId: user._id }).sort({ createdAt: -1 });
      case 'delivery_agent':
        return Order.find({ deliveryAgentId: user._id }).sort({ createdAt: -1 });
      default:
        return [];
    }
  }

  // Get a single order by ID (with access check)
  static async getOrderById(orderId: string, user: any): Promise<IOrder | null> {
    const order = await Order.findById(orderId);
    if (!order) return null;
    // Access control: only involved users can view
    if (
      String(order.customerId) === String(user._id) ||
      String(order.businessId) === String(user._id) ||
      String(order.deliveryAgentId) === String(user._id)
    ) {
      return order;
    }
    return null;
  }

  // Update order status (with role and status checks)
  static async updateOrderStatus(orderId: string, user: any, newStatus: OrderStatus): Promise<IOrder | null> {
    const order = await Order.findById(orderId);
    if (!order) return null;
    // Role and status transition validation
    switch (newStatus) {
      case 'ACCEPTED_BY_VENDOR':
        if (['hotel_manager', 'store_owner'].includes(user.role) && String(order.businessId) === String(user._id) && order.status === 'PLACED') {
          order.status = 'ACCEPTED_BY_VENDOR';
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'ACCEPTED_BY_AGENT':
        if (user.role === 'delivery_agent' && !order.deliveryAgentId && order.status === 'ACCEPTED_BY_VENDOR') {
          order.status = 'ACCEPTED_BY_AGENT';
          order.deliveryAgentId = user._id;
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'PICKED_UP':
        if (user.role === 'delivery_agent' && String(order.deliveryAgentId) === String(user._id) && order.status === 'ACCEPTED_BY_AGENT') {
          order.status = 'PICKED_UP';
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'DELIVERED':
        if (user.role === 'delivery_agent' && String(order.deliveryAgentId) === String(user._id) && order.status === 'PICKED_UP') {
          order.status = 'DELIVERED';
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'CANCELLED':
        if (user.role === 'customer' && String(order.customerId) === String(user._id) && ['PLACED', 'ACCEPTED_BY_VENDOR'].includes(order.status)) {
          order.status = 'CANCELLED';
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'REJECTED':
        if (['hotel_manager', 'store_owner'].includes(user.role) && String(order.businessId) === String(user._id) && order.status === 'PLACED') {
          order.status = 'REJECTED';
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      default:
        throw new Error('Invalid status');
    }
    await order.save();
    // Emit real-time event to all involved parties
    if (io) {
      io.to(String(order.customerId)).emit('order:status', order);
      io.to(String(order.businessId)).emit('order:status', order);
      if (order.deliveryAgentId) io.to(String(order.deliveryAgentId)).emit('order:status', order);
    }
    return order;
  }

  // Get available orders for delivery agents (not yet accepted)
  static async getAvailableOrdersForAgent(): Promise<IOrder[]> {
    return Order.find({ status: 'ACCEPTED_BY_VENDOR', deliveryAgentId: { $exists: false } }).sort({ createdAt: -1 });
  }
} 