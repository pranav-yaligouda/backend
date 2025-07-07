import Order, { IOrder, OrderStatus } from '../models/Order';
import Product from '../models/Product';
import mongoose from 'mongoose';

// Placeholder for Socket.io instance
let io: any = null;
export const setSocketIoInstance = (ioInstance: any) => {
  io = ioInstance;
};

export default class OrderService {
  // Create a new order
  static async createOrder(orderData: Partial<IOrder>): Promise<IOrder> {
    // Enhanced: Validate and decrement product stock for product orders
    if (orderData.businessType === 'store' && Array.isArray(orderData.items)) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        for (const item of orderData.items) {
          if (item.type !== 'product') continue;
          const product = await Product.findById(item.itemId).session(session);
          if (!product || !product.available) {
            throw new Error(`Product not found or unavailable: ${item.name}`);
          }
          if (item.quantity > product.stock) {
            throw new Error(`Insufficient stock for product: ${product.name}`);
          }
          // Decrement stock
          product.stock -= item.quantity;
          await product.save({ session });
        }
        const [order] = await Order.create([orderData], { session });
        if (!order) throw new Error('Order creation failed');
        await session.commitTransaction();
        // Emit real-time event to store owner
        if (io) {
          io.to(String(order.businessId)).emit('order:new', order);
        }
        return order;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } else {
      // Hotel/dish order (legacy logic)
      const order = await Order.create(orderData);
      if (io) {
        io.to(String(order.businessId)).emit('order:new', order);
      }
      return order;
    }
  }

  // Get orders by user role, with pagination and filtering
  static async getOrdersByRole(user: any, options: {
    page?: number;
    pageSize?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<{ data: IOrder[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const { page = 1, pageSize = 10, status, dateFrom, dateTo } = options;
    const query: any = {};
    // Role-based filtering
    switch (user.role) {
      case 'customer':
        query.customerId = user._id;
        break;
      case 'hotel_manager': {
        // Find all hotels managed by this user
        const Hotel = require('../models/Hotel').default;
        const hotels = await Hotel.find({ manager: user._id }).select('_id');
        const hotelIds = hotels.map((h: any) => h._id);
        query.businessType = 'hotel';
        query.businessId = { $in: hotelIds };
        break;
      }
      case 'store_owner': {
        // Use Store model to find all stores owned by this user
        const Store = require('../models/Store').default;
        const stores = await Store.find({ owner: user._id }).select('_id');
        const storeIds = stores.map((s: any) => s._id);
        query.businessType = 'store';
        query.businessId = { $in: storeIds };
        break;
      }
      case 'delivery_agent':
        query.deliveryAgentId = user._id;
        break;
      default:
        return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }
    // Filtering
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    // Role-based field selection
    let selectFields = '';
    if (user.role === 'delivery_agent') {
      selectFields = 'businessType pickupAddress deliveryAddress status notes createdAt updatedAt';
    } else if (user.role === 'customer') {
      selectFields = '-__v';
    } else {
      selectFields = '';
    }
    const skip = (page - 1) * pageSize;
    const [orders, total] = await Promise.all([
      Order.find(query)
        .select(selectFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Order.countDocuments(query),
    ]);

    // Populate product details for product order items
    const populatedOrders = await Promise.all(
      orders.map(async (order: any) => {
        if (order.businessType === 'store' && Array.isArray(order.items)) {
          const populatedItems = await Promise.all(order.items.map(async (item: any) => {
            if (item.type === 'product') {
              const product = await Product.findById(item.itemId);
              // Type guard for toObject
              const plainItem = typeof item.toObject === 'function' ? item.toObject() : { ...item };
              return { ...plainItem, product };
            }
            return typeof item.toObject === 'function' ? item.toObject() : { ...item };
          }));
          order = typeof order.toObject === 'function' ? order.toObject() : { ...order };
          order.items = populatedItems;
          return order;
        }
        return typeof order.toObject === 'function' ? order.toObject() : { ...order };
      })
    );
    const totalPages = Math.ceil(total / pageSize);
    return { data: populatedOrders, total, page, pageSize, totalPages };
  }

  // Get a single order by ID (with access check)
  static async getOrderById(orderId: string, user: any): Promise<Record<string, any> | null> {
    let order = await Order.findById(orderId);
    if (!order) return null;
    // Access control: only involved users can view
    if (
      String(order.customerId) === String(user._id) ||
      String(order.businessId) === String(user._id) ||
      String(order.deliveryAgentId) === String(user._id)
    ) {
      // Populate product details for product order items
      if (order.businessType === 'store' && Array.isArray(order.items)) {
        const populatedItems = await Promise.all(order.items.map(async (item: any) => {
          if (item.type === 'product') {
            const product = await Product.findById(item.itemId);
            const plainItem = typeof item.toObject === 'function' ? item.toObject() : { ...item };
            return { ...plainItem, product };
          }
          return typeof item.toObject === 'function' ? item.toObject() : { ...item };
        }));
        let plainOrder: any = typeof order.toObject === 'function' ? order.toObject() : { ...order };
        if (plainOrder) {
          plainOrder.items = populatedItems;
        }
        return plainOrder;
      }
      return (typeof order.toObject === 'function' ? order.toObject() : { ...order }) as Record<string, any>;

    }
    return null as Record<string, any> | null;
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