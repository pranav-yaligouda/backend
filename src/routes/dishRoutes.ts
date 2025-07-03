import { Router } from 'express';
import { addDish, getMyDishes, deleteDish, getDishesByHotelId } from '../controllers/dishController';
import upload from '../middleware/uploadImage';
import authMiddleware from '../middlewares/auth';
import { requireHotelManager } from '../middlewares/role';
import { validateBody } from '../middlewares/validate';
import { dishSchema } from '../validation/dish';

const router = Router();

// Public: Get all dishes for a hotel by hotelId
router.get('/hotel/:hotelId', getDishesByHotelId);

// POST /api/v1/dishes (protected, for hotel managers)
router.post(
  '/',
  authMiddleware,
  requireHotelManager,
  upload.single('image'),
  validateBody(dishSchema),
  addDish as any
);

router.get('/mine', authMiddleware, requireHotelManager, getMyDishes as any);
router.delete('/:dishId', authMiddleware, requireHotelManager, deleteDish as any);

export default router;
