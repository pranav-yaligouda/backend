import { Router } from 'express';
import OrderController from '../controllers/orderController';

const router = Router();

// Place a new order (customer)
router.post('/', OrderController.createOrder);

// Get orders for current user (role-based)
router.get('/', OrderController.getOrders);

// Get a single order by ID
router.get('/:id', OrderController.getOrderById);

// Update order status (vendor/agent)
router.patch('/:id/status', OrderController.updateOrderStatus);

// Get available orders for delivery agents
router.get('/available/agent', OrderController.getAvailableOrdersForAgent);

export default router; 