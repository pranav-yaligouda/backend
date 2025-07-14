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

// JWT Token configuration
const JWT_ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '86400'; // 1 day default
const JWT_REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '604800'; // 7 days default

// Helper function to generate tokens
const generateTokens = (user: any) => {
  // Base payload for all users
  const basePayload: any = {
    id: user.id,
    role: user.role,
    type: 'access'
  };

  // Add admin-specific fields for admin users
  if (user.role === 'admin') {
    basePayload.adminRole = user.adminRole || 'admin';
    basePayload.isActive = user.isActive !== false;
    basePayload.lastLoginAt = user.lastLoginAt;
  }

  const accessToken = jwt.sign(
    basePayload,
    process.env.JWT_SECRET!,
    { expiresIn: Number(JWT_ACCESS_TOKEN_EXPIRY) }
  );

  // Create refresh token payload (same as access but with type: 'refresh')
  const refreshPayload = { ...basePayload, type: 'refresh' };
  const refreshToken = jwt.sign(
    refreshPayload,
    process.env.JWT_SECRET!,
    { expiresIn: Number(JWT_REFRESH_TOKEN_EXPIRY) }
  );

  return { accessToken, refreshToken };
};

// Zod schemas for input validation
const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7).max(15),
  email: z.string().email().optional(),
  password: z.string().min(6),
  role: z.enum(['customer', 'hotel_manager', 'store_owner', 'delivery_agent', 'admin']),
  storeName: z.string().min(1).optional(),
  hotelName: z.string().min(1).optional(),
  // Admin-specific fields
  adminRole: z.enum(['super_admin', 'admin', 'moderator', 'support']).optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if ((data.role === 'store_owner') && !data.storeName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'storeName is required for Store Owner' });
  }
  if ((data.role === 'hotel_manager') && !data.hotelName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'hotelName is required for Hotel Manager' });
  }
  if ((data.role === 'admin') && !data.adminRole) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'adminRole is required for Admin users' });
  }
});

/**
 * Register a new user.
 * Validates input and returns JWT tokens on success.
 * Accessible to all (public).
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, password, role, storeName, hotelName, adminRole, isActive } = registerSchema.parse(req.body);
    // Check for existing user by phone or email
    const existingUser = await findUserByPhoneOrEmail(phone, email);
    if (existingUser) {
      return res.status(409).json({ success: false, data: null, error: 'User already exists' });
    }
    
    // Prepare user data with admin fields if applicable
    const userData: any = { name, phone, email, password, role, storeName, hotelName };
    if (role === 'admin') {
      userData.adminRole = adminRole;
      userData.isActive = isActive !== false; // Default to true if not specified
    }
    
    const user = await createUser(userData);

    // Generate both access and refresh tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set refresh token as httpOnly cookie for security
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(JWT_REFRESH_TOKEN_EXPIRY) * 1000 // Convert to milliseconds
    });

    // Prepare user response object
    const userResponse: any = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      storeName: user.storeName,
      hotelName: user.hotelName
    };

    // Add admin-specific fields for admin users
    if (user.role === 'admin') {
      userResponse.adminRole = user.adminRole;
      userResponse.isActive = user.isActive;
      userResponse.lastLoginAt = user.lastLoginAt;
    }

    res.status(201).json({
      success: true,
      data: {
        token: accessToken, // Send access token in response body
        refreshToken, // Also send refresh token for client storage if needed
        user: userResponse
      },
      error: null
    });
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
 * Validates credentials and returns JWT tokens on success.
 * Accessible to all (public).
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    const user = await findUserByPhone(phone);
    if (!user) return res.status(401).json({ success: false, data: null, error: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, data: null, error: 'Invalid credentials' });

    // Update lastLoginAt for admin users
    if (user.role === 'admin') {
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Generate both access and refresh tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set refresh token as httpOnly cookie for security
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(JWT_REFRESH_TOKEN_EXPIRY) * 1000 // Convert to milliseconds
    });

    // Prepare user response object
    const userResponse: any = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      storeName: user.storeName,
      hotelName: user.hotelName
    };

    // Add admin-specific fields for admin users
    if (user.role === 'admin') {
      userResponse.adminRole = user.adminRole;
      userResponse.isActive = user.isActive;
      userResponse.lastLoginAt = user.lastLoginAt;
    }

    res.json({
      success: true,
      data: {
        token: accessToken, // Send access token in response body
        refreshToken, // Also send refresh token for client storage if needed
        user: userResponse
      },
      error: null
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, data: null, error: err.errors });
    }
    next(err);
  }
};

/**
 * Refresh access token using refresh token.
 * Accessible to all (public).
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, data: null, error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, data: null, error: 'Invalid token type' });
    }

    // Generate new access token with admin fields if present
    const accessPayload: any = {
      id: decoded.id,
      role: decoded.role,
      type: 'access'
    };

    // Include admin fields if they exist in the decoded token
    if (decoded.role === 'admin') {
      accessPayload.adminRole = decoded.adminRole;
      accessPayload.isActive = decoded.isActive;
      accessPayload.lastLoginAt = decoded.lastLoginAt;
    }

    const accessToken = jwt.sign(
      accessPayload,
      process.env.JWT_SECRET!,
      { expiresIn: Number(JWT_ACCESS_TOKEN_EXPIRY) }
    );

    res.json({
      success: true,
      data: {
        token: accessToken,
        message: 'Access token refreshed successfully'
      },
      error: null
    });
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, data: null, error: 'Invalid refresh token' });
    }
    next(err);
  }
};

/**
 * Logout user by clearing refresh token cookie.
 * Accessible to all (public).
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
      error: null
    });
  } catch (err) {
    next(err);
  }
};
