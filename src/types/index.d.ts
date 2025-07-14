import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';
import { AuthUser } from './AuthUser';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
