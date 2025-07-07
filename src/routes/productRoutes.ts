import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController';
import { validateProduct } from '../../src/validation/product';
import authenticate from '../middlewares/auth';

const router = express.Router();

// Public endpoints
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Store owner endpoints (must be authenticated)
router.post('/', authenticate, validateProduct, createProduct);
router.put('/:id', authenticate, validateProduct, updateProduct);
router.delete('/:id', authenticate, deleteProduct);

export default router;
