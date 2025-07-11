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
      // Set pickupAddress for store orders
      if (orderData.businessId) {
        const Store = require('../models/Store').default;
        const store = await Store.findById(orderData.businessId);
        if (store) {
          // Use store.location.address if available, else store.address
          const addressLine = store.location?.address || store.address || '';
          let coordinates = { lat: 0, lng: 0 };
          if (Array.isArray(store.location?.coordinates) && store.location.coordinates.length === 2) {
            // Store: [lng, lat]
            coordinates = {
              lat: store.location.coordinates[1],
              lng: store.location.coordinates[0],
            };
          }
          orderData.pickupAddress = {
            addressLine,
            coordinates,
          };
        }
      }
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
      String(order.deliveryAgentId) === String(user._id) ||
      (order.businessType === 'hotel' && await isHotelManager(user._id, String(order.businessId))) ||
      (order.businessType === 'store' && await isStoreOwner(user._id, String(order.businessId)))
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
          if (io) io.to('delivery_agents_online').emit('order:new', order);
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'PREPARING':
        if (
          order.status === 'ACCEPTED_BY_VENDOR' &&
          (
            (user.role === 'hotel_manager' && await isHotelManager(user._id, String(order.businessId))) ||
            (user.role === 'store_owner' && await isStoreOwner(user._id, String(order.businessId)))
          )
        ) {
          order.status = 'PREPARING';
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'READY_FOR_PICKUP':
        if (
          order.status === 'PREPARING' &&
          (
            (user.role === 'hotel_manager' && await isHotelManager(user._id, String(order.businessId))) ||
            (user.role === 'store_owner' && await isStoreOwner(user._id, String(order.businessId)))
          )
        ) {
          order.status = 'READY_FOR_PICKUP';
          // PIN will be auto-generated by the pre-save hook
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'ACCEPTED_BY_AGENT':
        if (
          user.role === 'delivery_agent' &&
          order.status === 'READY_FOR_PICKUP' &&
          !order.deliveryAgentId
        ) {
          order.status = 'ACCEPTED_BY_AGENT';
          order.deliveryAgentId = user._id;
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'OUT_FOR_DELIVERY':
        if (
          user.role === 'delivery_agent' &&
          order.status === 'PICKED_UP' &&
          String(order.deliveryAgentId) === String(user._id)
        ) {
          order.status = 'OUT_FOR_DELIVERY';
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'DELIVERED':
        if (
          user.role === 'delivery_agent' &&
          order.status === 'OUT_FOR_DELIVERY' &&
          String(order.deliveryAgentId) === String(user._id)
        ) {
          order.status = 'DELIVERED';
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'CANCELLED':
        if (
          (user.role === 'customer' && String(order.customerId) === String(user._id)) ||
          (user.role === 'hotel_manager' && await isHotelManager(user._id, String(order.businessId))) ||
          (user.role === 'store_owner' && await isStoreOwner(user._id, String(order.businessId)))
        ) {
          order.status = 'CANCELLED';
        } else {
          throw new Error('Unauthorized or invalid status transition');
        }
        break;
      case 'REJECTED':
        if (
          (user.role === 'hotel_manager' && await isHotelManager(user._id, String(order.businessId))) ||
          (user.role === 'store_owner' && await isStoreOwner(user._id, String(order.businessId)))
        ) {
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

  // Verify pickup with PIN and update status to PICKED_UP
  static async verifyOrderPickup(orderId: string, user: any, pin: string): Promise<IOrder | null> {
    const order = await Order.findById(orderId);
    if (!order) return null;

    // Check if user is authorized to pick up this order
    if (
      user.role !== 'delivery_agent' ||
      order.status !== 'ACCEPTED_BY_AGENT' ||
      String(order.deliveryAgentId) !== String(user._id)
    ) {
      throw new Error('Unauthorized or invalid pickup attempt');
    }

    // Verify PIN
    if (!order.verificationPin || order.verificationPin !== pin) {
      throw new Error('Invalid verification PIN');
    }

    // Update status to PICKED_UP
    order.status = 'PICKED_UP';
    await order.save();

    // Emit real-time event to all involved parties
    if (io) {
      io.to(String(order.customerId)).emit('order:status', order);
      io.to(String(order.businessId)).emit('order:status', order);
      io.to(String(order.deliveryAgentId)).emit('order:status', order);
      // Notify hotel/store about successful pickup
      io.to(String(order.businessId)).emit('order:pickup_verified', order);
    }

    return order;
  }

  // Get available orders for delivery agents (not yet accepted)
  static async getAvailableOrdersForAgent(): Promise<IOrder[]> {
    return Order.find({
      status: 'READY_FOR_PICKUP',
      $or: [
        { deliveryAgentId: null },
        { deliveryAgentId: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });
  }

  // Get orders assigned to a specific delivery agent
  static async getOrdersForAgent(agentId: string): Promise<IOrder[]> {
    return Order.find({
      deliveryAgentId: agentId,
      status: { $in: ['ACCEPTED_BY_AGENT', 'PICKED_UP', 'OUT_FOR_DELIVERY'] }
    }).sort({ createdAt: -1 });
  }
}