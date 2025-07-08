import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { agentVerificationSchema, agentOnlineStatusSchema } from '../validation/user';
import { getLogger } from '../middlewares/auditLogger';

const logger = getLogger('agent');

export default class AgentController {
  // Submit verification details
  static async submitVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?._id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const parsed = agentVerificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.flatten() });
      }
      const { driverLicenseNumber, vehicleRegistrationNumber } = parsed.data;
      const user = await User.findByIdAndUpdate(
        userId,
        {
          driverLicenseNumber,
          vehicleRegistrationNumber,
          isVerified: false, // Set to false until admin verifies
          verificationStatus: 'pending',
        },
        { new: true }
      );
      logger.info(`Agent ${userId} submitted verification details.`);
      return res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  // Set online/offline status
  static async setOnlineStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?._id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const parsed = agentOnlineStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.flatten() });
      }
      const { isOnline } = parsed.data;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      if (user.role !== 'delivery_agent') return res.status(403).json({ success: false, error: 'Not a delivery agent' });
      if (!user.isVerified) return res.status(403).json({ success: false, error: 'Agent not verified' });
      user.isOnline = isOnline;
      user.lastOnlineAt = new Date();
      await user.save();
      logger.info(`Agent ${userId} set online status to ${isOnline}`);
      return res.json({ success: true, data: { isOnline: user.isOnline, lastOnlineAt: user.lastOnlineAt } });
    } catch (err) {
      next(err);
    }
  }

  // Get agent profile/status
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?._id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const user = await User.findById(userId).select('-password');
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      // Explicitly include verificationStatus in the response
      const userObj = user.toObject();
      return res.json({ success: true, data: { ...userObj, verificationStatus: userObj.verificationStatus } });
    } catch (err) {
      next(err);
    }
  }
} 