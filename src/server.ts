// ------------------------------
// Server Initialization
// ------------------------------
import { createServer } from 'http';
import mongoose from 'mongoose';
import app from './app';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { setSocketIoInstance } from './services/orderService';

// ------------------------------
// Environment Variables
// ------------------------------
// Use the port provided by the environment (Render, Heroku, etc.) or default to 4000 for local development
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const HOST = '0.0.0.0'; // Listen on all interfaces for cloud compatibility
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AthaniMart';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ------------------------------
// HTTP and Socket.IO Server
// ------------------------------
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CORS_ORIGIN.split(',').map(origin => origin.trim()),
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
});

// Pass Socket.io instance to order service
setSocketIoInstance(io);

// Socket.IO connection handler
io.on('connection', (socket: Socket) => {
  // Clients join rooms for targeted notifications
  socket.on('join', (roomId: string) => {
    socket.join(roomId);
  });
});

// ------------------------------
// MongoDB Connection
// ------------------------------
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`);
      console.log('Ready for cloud and local deployment.');
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// ------------------------------
// Graceful Shutdown
// ------------------------------
const shutdown = async (signal: string) => {
  await mongoose.connection.close();
  console.log(`MongoDB connection closed due to app ${signal}`);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('termination'));
process.on('SIGINT', () => shutdown('interruption'));
