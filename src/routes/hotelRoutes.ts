import express from 'express';
import { createHotel, getMyHotel, updateMyHotel, getAllHotels } from '../controllers/hotelController';
import authMiddleware from '../middlewares/auth';
import { requireHotelManager } from '../middlewares/role';
import { upload } from '../middlewares/upload';
import { validateBody } from '../middlewares/validate';
import { hotelSchema } from '../validation/hotel';

const router = express.Router();

// Public: Get a single hotel by ID (for menu page, etc)
import { getHotelById } from '../controllers/hotelController';
router.get('/:id', getHotelById);

// Public: Get all hotels (with dishes)
router.get('/', getAllHotels);

router.post(
  '/',
  authMiddleware,
  requireHotelManager,
  validateBody(hotelSchema),
  createHotel
);

router.get('/me', authMiddleware, requireHotelManager, getMyHotel);

router.patch(
  '/me',
  authMiddleware,
  requireHotelManager,
  validateBody(hotelSchema),
  updateMyHotel
);

export default router;
