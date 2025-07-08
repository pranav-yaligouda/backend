import { z } from 'zod';

export const agentVerificationSchema = z.object({
  driverLicenseNumber: z.string().min(5, 'Driver License Number is required'),
  vehicleRegistrationNumber: z.string().min(5, 'Vehicle Registration Number is required'),
});

export const agentOnlineStatusSchema = z.object({
  isOnline: z.boolean(),
});

// For future use:
// export const verificationStatusSchema = z.enum(['pending', 'verified', 'rejected']); 