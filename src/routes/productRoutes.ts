import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductToStore,
  getCatalogProducts,
  getAllAvailableStoreProducts
} from '../controllers/productController';
import { validateCatalogProduct, validateStoreProduct } from '../validation/product';
import authenticate from '../middlewares/auth';
// import authorizeStoreOwner from '../middlewares/role'; // Stub for future use
const storeProductController = require('../controllers/storeProductController');

const router = express.Router();

// Public endpoints
router.get('/', getAllProducts);
// Move /store-products above /:id to prevent collision
router.get('/store-products', getAllAvailableStoreProducts);
router.get('/:id', getProductById);

// Global product catalog endpoint
router.get('/catalog/products', getCatalogProducts);

// Catalog product creation (admin or system only, if needed)
router.post('/', authenticate, validateCatalogProduct, createProduct);
router.put('/:id', authenticate, validateCatalogProduct, updateProduct);
router.delete('/:id', authenticate, deleteProduct);

// Store inventory: add product to store
router.post('/store/:storeId', authenticate, /*authorizeStoreOwner,*/ validateStoreProduct, addProductToStore);
// Replace the old store-products route with the new robust controller

export default router;
