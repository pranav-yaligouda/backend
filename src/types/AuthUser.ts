// src/types/AuthUser.ts
export interface AuthUser {
  _id: string;           // Always string in JWT/session context
  id?: string;           // Legacy support: sometimes present in JWT
  role: string;          // Or import UserRole if you want stricter typing
  name: string;
  email?: string;
  phone: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  // Add any other properties you attach to req.user after authentication
}
