import { Router } from 'express';
import { register, login, refreshToken, logout } from '../controllers/authController';

const router = Router();

// Authentication endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

export default router;
