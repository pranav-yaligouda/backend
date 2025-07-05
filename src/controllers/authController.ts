/**
 * Authentication Controller
 * Handles user registration, login, and authentication-related endpoints.
 * All responses follow the { success, data, error } structure for consistency.
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByPhone, findUserByPhoneOrEmail } from '../services/userService';

// Zod schemas for input validation
const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7).max(15),
  email: z.string().email().optional(),
  password: z.string().min(6),
  role: z.enum(['customer', 'hotel_manager', 'store_owner', 'delivery_agent', 'admin']),
  storeName: z.string().min(1).optional(),
  hotelName: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
  if ((data.role === 'store_owner') && !data.storeName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'storeName is required for Store Owner' });
  }
  if ((data.role === 'hotel_manager') && !data.hotelName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'hotelName is required for Hotel Manager' });
  }
});

/**
 * Register a new user.
 * Validates input and returns a JWT token on success.
 * Accessible to all (public).
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, password, role, storeName, hotelName } = registerSchema.parse(req.body);
    // Check for existing user by phone or email
    const existingUser = await findUserByPhoneOrEmail(phone, email);
    if (existingUser) {
      return res.status(409).json({ success: false, data: null, error: 'User already exists' });
    }
    const user = await createUser({ name, phone, email, password, role, storeName, hotelName });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '1d' });
    res.status(201).json({ success: true, data: { token, user: {
      id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, storeName: user.storeName, hotelName: user.hotelName
    } }, error: null });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, data: null, error: err.errors });
    }
    next(err);
  }
};

const loginSchema = z.object({
  phone: z.string().min(7).max(15),
  password: z.string().min(6),
});

/**
 * Log in an existing user.
 * Validates credentials and returns a JWT token on success.
 * Accessible to all (public).
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    const user = await findUserByPhone(phone);
    if (!user) return res.status(401).json({ success: false, data: null, error: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, data: null, error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '1d' });
    res.json({ success: true, data: { token, user: {
      id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, storeName: user.storeName, hotelName: user.hotelName
    } }, error: null });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, data: null, error: err.errors });
    }
    next(err);
  }
};
