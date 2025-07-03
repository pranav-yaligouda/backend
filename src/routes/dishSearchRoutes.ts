import express from 'express';
import { searchDishes } from '../controllers/dishSearchController';

const router = express.Router();

// Advanced search/filter endpoint
router.get('/', searchDishes);

export default router;
