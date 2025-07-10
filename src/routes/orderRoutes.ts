import { Router } from 'express';
import OrderController from '../controllers/orderController';
import { validateQuery } from '../middlewares/validate';
import { orderQuerySchema } from '../validation/order';
import authenticate from '../middlewares/auth';
// import { validateOrder } from '../validation/order'; // Placeholder for future use

const router = Router();

// Place a new order (customer)
router.post('/', authenticate, /*validateOrder,*/ (req, res, next) => OrderController.createOrder(req as any, res, next));

// Get orders for current user (role-based)
router.get('/', authenticate, validateQuery(orderQuerySchema), (req, res, next) => OrderController.getOrders(req as any, res, next));

// Get a single order by ID
router.get('/:id', authenticate, (req, res, next) => OrderController.getOrderById(req as any, res, next));

// Update order status (vendor/agent)
router.patch('/:id/status', authenticate, (req, res, next) => OrderController.updateOrderStatus(req as any, res, next));

// Get available orders for delivery agents
router.get('/available/agent', authenticate, (req, res, next) => OrderController.getAvailableOrdersForAgent(req as any, res, next));

export default router; 