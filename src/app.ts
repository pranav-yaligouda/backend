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
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}));
app.use(express.json({ limit: '4mb' }));

// Swagger docs

import fs from 'fs';

let swaggerDocument;
try {
  swaggerDocument = require('../swagger.json');
} catch (e) {
  // Fallback for ts-node-dev: read JSON directly
  swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, '../swagger.json'), 'utf-8'));
}
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
app.use('/api/v1/hotels', require('./routes/hotelRoutes').default);
app.use('/api/v1/dishes', require('./routes/dishRoutes').default);

app.use('/api/v1/dish-search', require('./routes/dishSearchRoutes').default);

app.use(errorHandler);

// Debug: Warn if StandardDish collection is empty after connect



export default app;
