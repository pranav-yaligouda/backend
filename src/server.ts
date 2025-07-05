// ------------------------------
// Server Initialization
// ------------------------------
import app from './app';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { setSocketIoInstance } from './services/orderService';

// ------------------------------
// Environment Variables
// ------------------------------
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const HOST = '0.0.0.0';
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
