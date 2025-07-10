import Order, { IOrder, OrderStatus } from '../models/Order';
import Product from '../models/Product';
import mongoose from 'mongoose';
import User from '../models/User';
import { getLogger } from '../middlewares/auditLogger';
const logger = getLogger('orderService');

// Placeholder for Socket.io instance
let io: any = null;
export const setSocketIoInstance = (ioInstance: any) => {
  io = ioInstance;
};

// Add a type guard for stock
function hasStock(product: any): product is { stock: number } {
  return product && typeof product === 'object' && 'stock' in product && typeof product.stock === 'number';
}

// Utility: robust ObjectId casting
function toObjectId(id: any): mongoose.Types.ObjectId {
  if (!id) throw new Error('Missing ID');
  if (typeof id === 'string') {
    const trimmed = id.trim();
    if (!/^[a-fA-F0-9]{24}$/.test(trimmed)) throw new Error('Invalid ObjectId string: ' + id);
    return new mongoose.Types.ObjectId(trimmed);
  }
  if (id instanceof mongoose.Types.ObjectId) return id;
  throw new Error('Invalid ID type: ' + id);
}

// Add these helper functions at the top (after imports):
async function isHotelManager(userId: string, hotelId: string) {
  const Hotel = require('../models/Hotel').default;
  const hotel = await Hotel.findOne({ _id: hotelId, manager: userId });
  return !!hotel;
}

async function isStoreOwner(userId: string, storeId: string) {
  const Store = require('../models/Store').default;
  const store = await Store.findOne({ _id: storeId, owner: userId });
  return !!store;
}

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
          // Defensive: Check for valid IDs
          if (!item.itemId || !orderData.businessId) {
            throw new Error(`Missing product or store ID for item: ${item.name}`);
          }
          let productId, storeId;
          try {
            productId = toObjectId(item.itemId);
            storeId = toObjectId(orderData.businessId);
          } catch (e) {
            // Log for debugging
            console.error('[OrderService] Invalid ObjectId for product or store:', item.itemId, orderData.businessId, 'Type:', typeof item.itemId, typeof orderData.businessId);
            throw new Error(`Invalid ObjectId for product or store: ${item.itemId}, ${orderData.businessId}`);
          }
          // Find the store's inventory for this product
          const storeProduct = await require('../models/StoreProduct').default.findOne({
            productId,
            storeId
          }).session(session);
          if (!storeProduct || typeof storeProduct.quantity !== 'number' || storeProduct.quantity < item.quantity) {
            // Log for debugging
            console.error('[OrderService] StoreProduct not found or insufficient stock:', {
              productId: item.itemId,
              storeId: orderData.businessId,
              found: !!storeProduct,
              quantity: storeProduct ? storeProduct.quantity : null,
              required: item.quantity
            });
            throw new Error(`Product stock information missing for: ${item.name}`);
          }
          // Decrement stock
          storeProduct.quantity -= item.quantity;
          await storeProduct.save({ session });
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
              if (!hasStock(product)) {
                logger.warn(`Product stock information missing for item: ${item.name}`);
                return { ...item, product: null }; // Return item with no product
              }
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
            if (!hasStock(product)) {
              logger.warn(`Product stock information missing for item: ${item.name}`);
              return { ...item, product: null }; // Return item with no product
            }
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
        if (
          order.status === 'PLACED' &&
          (
            (user.role === 'hotel_manager' && await isHotelManager(user._id, String(order.businessId))) ||
            (user.role === 'store_owner' && await isStoreOwner(user._id, String(order.businessId)))
          )
        ) {
          order.status = 'ACCEPTED_BY_VENDOR';
          // Emit to all online, verified delivery agents
          if (io) {
            io.to('delivery_agents_online').emit('order:new', order);
          }
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'ACCEPTED_BY_AGENT':
        if (user.role === 'delivery_agent' && !order.deliveryAgentId && order.status === 'ACCEPTED_BY_VENDOR') {
          // Check agent is verified and online
          const agent = await User.findById(user._id);
          if (!agent || agent.verificationStatus !== 'verified' || !agent.isOnline) {
            logger.warn(`Agent ${user._id} attempted to accept order ${orderId} but is not verified/online.`);
            throw new Error('Agent must be verified and online to accept orders');
          }
          order.status = 'ACCEPTED_BY_AGENT';
          order.deliveryAgentId = user._id;
          logger.info(`Order ${orderId} assigned to agent ${user._id}`);
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
    return Order.find({
      status: 'ACCEPTED_BY_VENDOR',
      $or: [
        { deliveryAgentId: null },
        { deliveryAgentId: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });
  }
}