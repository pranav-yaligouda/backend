import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export default function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  // Log method and path for traceability
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[authMiddleware] ${req.method} ${req.originalUrl} - Authorization header:`, authHeader);
  }
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error(`[authMiddleware] ${req.method} ${req.originalUrl} - No token provided`);
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      console.log('[authMiddleware] Invalid token:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }
    // Always set req.user as object with _id
    let userObj: any = user;
    if (typeof user === 'string') {
      try {
        userObj = JSON.parse(user);
      } catch {}
    }
    // Always ensure req.user._id and req.user.id are set and are strings
    if (userObj && userObj.id && !userObj._id) {
      userObj._id = userObj.id;
    }
    if (userObj && userObj._id && typeof userObj._id !== 'string') {
      userObj._id = String(userObj._id);
    }
    if (userObj && userObj._id && !userObj.id) {
      userObj.id = userObj._id;
    }
    if (userObj && userObj.id && typeof userObj.id !== 'string') {
      userObj.id = String(userObj.id);
    }
    (req as any).user = userObj;
    console.log('[authMiddleware] req.user set to:', userObj, 'id:', userObj.id, '_id:', userObj._id);
    next();
  });
}

