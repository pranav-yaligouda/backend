import { Router } from 'express';
import OrderController from '../controllers/orderController';

const router = Router();

// Place a new order (customer)
router.post('/', (req, res, next) => OrderController.createOrder(req as any, res, next));

// Get orders for current user (role-based)
router.get('/', (req, res, next) => OrderController.getOrders(req as any, res, next));

// Get a single order by ID
router.get('/:id', (req, res, next) => OrderController.getOrderById(req as any, res, next));

// Update order status (vendor/agent)
router.patch('/:id/status', (req, res, next) => OrderController.updateOrderStatus(req as any, res, next));

// Get available orders for delivery agents
router.get('/available/agent', (req, res, next) => OrderController.getAvailableOrdersForAgent(req as any, res, next));

export default router; 