import app from './app';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { setSocketIoInstance } from './services/orderService';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const HOST = '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AthaniMart';

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

// Pass Socket.io instance to order service
setSocketIoInstance(io);

io.on('connection', (socket: Socket) => {
  // Client should join rooms for their userId and businessId for targeted notifications
  socket.on('join', (roomId: string) => {
    socket.join(roomId);
  });
});

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

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app interruption');
  process.exit(0);
});
