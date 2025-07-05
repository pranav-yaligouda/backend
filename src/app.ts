// ------------------------------
// Express App Initialization
// ------------------------------
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { cleanEnv, str, port } from 'envalid';
import swaggerUi from 'swagger-ui-express';
import mongoose from 'mongoose';
import path from 'path';

// Import API routes and middlewares
import authRoutes from './routes/auth';
import hotelRoutes from './routes/hotelRoutes';
import dishRoutes from './routes/dishRoutes';
import dishSearchRoutes from './routes/dishSearchRoutes';
import orderRoutes from './routes/orderRoutes';
import errorHandler from './middlewares/errorHandler';
import authenticateToken from './middlewares/auth';
import { auditLogger } from './middlewares/auditLogger';

// ------------------------------
// Environment & Config
// ------------------------------
dotenv.config();
cleanEnv(process.env, {
  MONGODB_URI: str(),
  JWT_SECRET: str(),
  PORT: port({ default: 4000 }),
  CORS_ORIGIN: str({ default: '*' })
});

const app = express();

// ------------------------------
// Static Files
// ------------------------------
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ------------------------------
// Security & Logging
// ------------------------------
app.use(helmet());
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ------------------------------
// CORS Configuration
// ------------------------------
// For local: CORS_ORIGIN=http://localhost:3000
// For prod:  CORS_ORIGIN=https://yourfrontend.com
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Trust proxy for secure cookies in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ------------------------------
// Body Parsing
// ------------------------------
app.use(express.json({ limit: '4mb' }));

// ------------------------------
// API Documentation
// ------------------------------
const swaggerDocument = require('../swagger.json');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ------------------------------
// Health Check
// ------------------------------
app.get('/api/v1/health', async (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  res.json({ status: dbState === 1 ? 'ok' : 'disconnected' });
});

// ------------------------------
// Example Protected Route
// ------------------------------
app.get('/api/v1/protected', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: 'This is a protected route', user: (req as any).user });
});

// ------------------------------
// Audit Logging
// ------------------------------
app.use(auditLogger);

// ------------------------------
// API Routes
// ------------------------------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/hotels', hotelRoutes);
app.use('/api/v1/dishes', dishRoutes);
app.use('/api/v1/dish-search', dishSearchRoutes);
app.use('/api/v1/orders', authenticateToken, orderRoutes);

// ------------------------------
// Error Handling
// ------------------------------
app.use(errorHandler);

export default app;
