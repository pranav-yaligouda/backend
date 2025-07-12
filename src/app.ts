// ------------------------------
// Express App Initialization
// ------------------------------
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path from 'path';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import cookieParser from 'cookie-parser';
import { cleanEnv, port, str } from 'envalid';

// Import API routes and middlewares
import agentRoutes from './routes/agentRoutes';
import authRoutes from './routes/auth';
import dishRoutes from './routes/dishRoutes';
import dishSearchRoutes from './routes/dishSearchRoutes';
import errorHandler from './middlewares/errorHandler';
import authenticateToken from './middlewares/auth';
import { auditLogger } from './middlewares/auditLogger';
import hotelRoutes from './routes/hotelRoutes';
import orderRoutes from './routes/orderRoutes';
import productRoutes from './routes/productRoutes';
import storeRoutes from './routes/storeRoutes';

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

// ------------------------------
// CORS Configuration (Robust for Dev & Prod)
// ------------------------------
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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));

// ------------------------------
// Rate Limiting (Higher in Dev, Strict in Prod)
// ------------------------------
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Trust proxy for secure cookies in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ------------------------------
// Body Parsing & Cookies
// ------------------------------
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
app.use('/api/v1/agent', agentRoutes);
app.use('/api/v1/stores', storeRoutes);
app.use('/api/v1/products', productRoutes);

// ------------------------------
// Error Handling
// ------------------------------
app.use(errorHandler);

export default app;
