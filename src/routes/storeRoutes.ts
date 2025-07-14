import express from 'express';
import {
  getAllStores,
  getStoreById,
  createStore,
  getMyStore,
  updateMyStore,
  deleteMyStore
} from '../controllers/storeController';
import { validateStore } from '../validation/store';
import authenticate from '../middlewares/auth';

const router = express.Router();

// /me routes must come before /:id to avoid route collision
router.get('/me', authenticate, getMyStore);
router.put('/me', authenticate, validateStore, updateMyStore);
router.delete('/me', authenticate, deleteMyStore);

router.get('/', getAllStores);
router.get('/:id', getStoreById);
router.post('/', authenticate, validateStore, createStore);
// Add product to store inventory
router.post('/:storeId/products', require('./../controllers/storeController').addProductToStore);
// Fetch store inventory
router.get('/:storeId/products', require('./../controllers/storeController').getStoreProducts);

export default router;
