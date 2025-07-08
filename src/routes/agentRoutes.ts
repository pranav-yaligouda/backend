import { Router } from 'express';
import AgentController from '../controllers/agentController';
import authenticateToken from '../middlewares/auth';

const router = Router();

// Submit verification details
router.post('/verify', authenticateToken, AgentController.submitVerification);
// Set online/offline status
router.post('/online', authenticateToken, AgentController.setOnlineStatus);
// Get agent profile
router.get('/profile', authenticateToken, AgentController.getProfile);

export default router; 