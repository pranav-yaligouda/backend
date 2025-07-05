import express from 'express';
import { createHotel, getMyHotel, updateMyHotel, getAllHotels } from '../controllers/hotelController';
import authMiddleware from '../middlewares/auth';
import { requireHotelManager } from '../middlewares/role';
import { upload } from '../middlewares/upload';
import { validateBody } from '../middlewares/validate';
import { hotelSchema } from '../validation/hotel';

const router = express.Router();

// /me route must be above /:id to avoid shadowing
router.get('/me', authMiddleware, requireHotelManager, getMyHotel);
router.patch(
  '/me',
  authMiddleware,
  requireHotelManager,
  validateBody(hotelSchema),
  updateMyHotel
);

// Public: Get a single hotel by ID (for menu page, etc)
import { getHotelById } from '../controllers/hotelController';
router.get('/:id', (req, res, next) => getHotelById(req as any, res, next));

// Public: Get all hotels (with dishes)
router.get('/', (req, res, next) => getAllHotels(req as any, res, next));

router.post(
  '/',
  authMiddleware,
  requireHotelManager,
  validateBody(hotelSchema),
  (req, res) => createHotel(req as any, res)
);


export default router;
