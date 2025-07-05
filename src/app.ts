import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { cleanEnv, str, port } from 'envalid';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth';
import errorHandler from './middlewares/errorHandler';
import authenticateToken from './middlewares/auth';
import { auditLogger } from './middlewares/auditLogger';
import mongoose from 'mongoose';
import path from 'path';
import orderRoutes from './routes/orderRoutes';


dotenv.config();

// Debug: Print MongoDB URI at startup
console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Environment validation
cleanEnv(process.env, {
  MONGODB_URI: str(),
  JWT_SECRET: str(),
  PORT: port({ default: 4000 }),
  CORS_ORIGIN: str({ default: '*' })
});

const app = express();

// Serve static files from uploads directory

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Security middlewares
app.use(helmet());
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Restrict CORS origin for production
// For local development, set CORS_ORIGIN=http://localhost:3000 in your .env file
// For production, set CORS_ORIGIN to your deployed frontend domain (e.g., https://yourfrontend.com)
// Robust, production-ready CORS setup
// Supports multiple origins (comma-separated in CORS_ORIGIN)
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// For production, trust proxy for secure cookies (e.g., behind load balancer)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.use(express.json({ limit: '4mb' }));

// Swagger docs

import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerDocument = require('../swagger.json');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// DB health check endpoint
app.get('/api/v1/health', async (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  res.json({ status: dbState === 1 ? 'ok' : 'disconnected' });
});

// Example protected route
app.get('/api/v1/protected', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: 'This is a protected route', user: (req as any).user });
});

// Audit logging middleware (logs all mutating requests)
app.use(auditLogger);

// API versioning
app.use('/api/v1/auth', authRoutes);
import hotelRoutes from './routes/hotelRoutes';
import dishRoutes from './routes/dishRoutes';
import dishSearchRoutes from './routes/dishSearchRoutes';

app.use('/api/v1/hotels', hotelRoutes);
app.use('/api/v1/dishes', dishRoutes);
app.use('/api/v1/dish-search', dishSearchRoutes);

// Register order routes with authentication
app.use('/api/v1/orders', authenticateToken, orderRoutes);

app.use(errorHandler);

// Debug: Warn if StandardDish collection is empty after connect



export default app;
