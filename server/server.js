import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pkg from 'pg';
const { Pool } = pkg;

// استيراد المسارات
import authRoutes from './src/routes/authRoutes.js';
import guideRoutes from './src/routes/guideRoutes.js';
import programRoutes from './src/routes/programRoutes.js';
import walletRoutes from './src/routes/walletRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5002;

// ===================== إعداد WebSocket =====================
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'https://tourist-app-api.onrender.com'],
    credentials: true
  }
});

// تخزين المستخدمين المتصلين
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('user-connected', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('users-online', Array.from(onlineUsers.keys()));
    console.log(`👤 User ${userId} is online`);
  });

  socket.on('join-chat', (chatId) => {
    socket.join(`chat:${chatId}`);
    console.log(`📢 User joined chat: ${chatId}`);
  });

  socket.on('leave-chat', (chatId) => {
    socket.leave(`chat:${chatId}`);
  });

  socket.on('send-message', (message) => {
    socket.to(`chat:${message.chatId}`).emit('new-message', message);
  });

  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(`chat:${chatId}`).emit('typing', { userId: socket.userId, isTyping });
  });

  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }
    if (disconnectedUserId) {
      io.emit('users-online', Array.from(onlineUsers.keys()));
      console.log(`👋 User ${disconnectedUserId} disconnected`);
    }
  });
});

// ===================== إعداد PostgreSQL =====================
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'touristapp',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// اختبار الاتصال بقاعدة البيانات
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully');
    console.log(`📦 Database: ${pool.options.database}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    return false;
  }
};

// ===================== Middleware =====================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'https://tourist-app-api.onrender.com'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ===================== Routes الرئيسية =====================
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Tourist App API is running',
    docs: '/api/test',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      guides: '/api/guides',
      programs: '/api/programs',
      wallet: '/api/wallet',
      bookings: '/api/bookings',
      chats: '/api/chats',
      notifications: '/api/notifications'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// ===================== Route إضافي للمحفظة (مؤقت حتى يكتمل walletRoutes) =====================
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📥 Fetching wallet for user: ${userId}`);
    
    const result = await pool.query(
      'SELECT * FROM app.wallets WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Wallet not found' 
      });
    }
    
    res.json({ 
      success: true, 
      wallet: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error fetching wallet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// ===================== Test route =====================
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ Server is working with PostgreSQL!',
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
    onlineUsers: onlineUsers.size
  });
});

// ===================== Health check =====================
app.get('/health', async (req, res) => {
  const dbConnected = await connectDB().catch(() => false);
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    database: dbConnected ? 'connected' : 'disconnected',
    websocket: 'active',
    onlineUsers: onlineUsers.size
  });
});

// ===================== Database connection and server start =====================
const startServer = async () => {
  const dbConnected = await connectDB();
  
  if (!dbConnected) {
    console.error('❌ Failed to connect to database. Exiting...');
    process.exit(1);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║         🚀 TOURIST APP SERVER               ║
  ╠══════════════════════════════════════════════╣
  ║  ▶ Port:        ${PORT}
  ║  ▶ Database:    ✅ PostgreSQL
  ║  ▶ WebSocket:   ✅ Enabled
  ║  ▶ Test API:    /api/test
  ║  ▶ Health:      /health
  ╚══════════════════════════════════════════════╝
    `);
  });
};

startServer();

export { io, onlineUsers, pool };