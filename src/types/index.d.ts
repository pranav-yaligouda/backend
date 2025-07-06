import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';

// Extend user type to include _id and role for type safety
interface AuthUser {
  _id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
